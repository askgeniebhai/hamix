# Validation Report — M8: Changelog + Close the Feedback Loop

- **Milestone ID:** M8
- **Objective:** Complete the sellable closed loop — Feedback → Vote →
  Discussion → Admin Triage → Roadmap → Complete → Changelog → notify
  the interested customer. A genuine Changelog entity linked to Posts
  through a junction table, an explicit per-post "Follow updates"
  subscription, and deterministic, idempotent notification delivery
  with no queue/worker infrastructure.
- **Repository:** `askgeniebhai/hamix`
- **Branch:** `claude/feedback-m8-changelog-close-loop`
- **Starting SHA:** `7dcb309df649a1c564c8bb5c99afd2e4e6022cda` (tip of
  `main` after PR #30 / M7 merged)
- **Ending SHA:** `a2414c1ec857eeb63b47e2aadb8722f96850cab4` (this
  commit — application code, governance docs, and this report land
  together)
- **Files changed:** new changelog schema and migration
  (`lib/db/feedback-schema.ts`, `drizzle/0005_keen_the_twelve.sql`),
  a new changelog data-access module (`lib/changelog/data.ts`), a new
  email module (`lib/email/`: `transport.ts`, `resend-transport.ts`,
  `get-transport.ts`, `templates.ts`), new subscription functions in
  `lib/feedback/data.ts`, new validation (`lib/validation/changelog.ts`),
  new env fields (`lib/env.ts`), the `resend` dependency, admin
  changelog pages/actions (`app/(workspace)/changelog/`), public
  changelog page (`app/b/[slug]/changelog/`), the unsubscribe route
  (`app/unsubscribe/[token]/`), follow/unfollow on the public post
  detail page, nav updates (`PublicBoardNav`, `AppSidebar`), `proxy.ts`,
  new unit/integration tests, `tests/support/fake-email-transport.ts`,
  and `e2e/changelog.spec.ts`.

## Changelog schema

`changelog_entry` — `id`, `organization_id`, `title`, `body`,
`created_by_user_id`, `state` (a real Postgres enum, `draft`/
`published`), `created_at`, `published_at`. `changelog_entry_post` — a
junction table, unique on `(changelog_entry_id, post_id)`, never
duplicating a post's title/description. `post_subscription` — unique
on `(post_id, participant_id)`, plus a separate unique
`unsubscribe_token`. `changelog_notification` — one row per
(entry, recipient) with a `pending`/`sent`/`failed` state, unique on
`(changelog_entry_id, participant_id)`. Full reasoning in
`DECISIONS.md` D8-001.

## Feedback-link architecture

Linking is enforced at the data layer, not just the picker UI:
`linkPostToChangelogEntry()` requires the target post to be `complete`
and in the same organization as the (still-`draft`) entry.
`publishChangelogEntry()` re-verifies every linked post is *still*
`complete` immediately before publishing — a post that regressed since
being linked blocks the publish outright, with a clear error, rather
than silently dropping the stale link.

## Follow/subscription design

`post_subscription` rows are created by exactly one path —
`subscribeToPost()`, called only from the "Follow updates" button's
server action. Submitting, voting, and commenting never create a
subscription. Unfollowing works two ways: a cookie-identified
participant can "Stop following" directly on the post detail page; a
single-purpose `unsubscribeToken` (distinct from the participant's own
`publicToken`) works with no session at all, for the email link — a
leaked or forwarded unsubscribe link can only remove that one
subscription. Full reasoning in `DECISIONS.md` D8-003.

## Notification recipient logic

`publishChangelogEntry()` computes recipients as the distinct set of
participants with a `post_subscription` on *any* of the entry's linked
posts — a participant following two linked posts is one recipient, not
two. Internal workspace members are never recipients (they have no
`post_subscription` rows; only external participants do). This is a
direct database query (`SELECT DISTINCT ... JOIN participant ...
WHERE post_id IN (...)`), never a client-side computation.

## Delivery / idempotency model

Publishing is a single transaction: an atomic `UPDATE ... SET state =
'published' ... WHERE state = 'draft'` (so a concurrent second publish
attempt updates zero rows and is rejected before it ever computes
recipients), plus an insert of one `pending` `changelog_notification`
row per recipient with `ON CONFLICT DO NOTHING`. Only after that
transaction commits does the code attempt to actually send each
notification, updating it to `sent` or `failed` (with a truncated
reason) individually. No queue, worker, or outbox-processor exists —
one loop over a handful of recipients inside the publish request is
the entire delivery mechanism, deliberately, per M8's explicit
instruction not to invent asynchronous infrastructure this scale
doesn't need. Full reasoning in `DECISIONS.md` D8-004.

## Email adapter

`lib/email/transport.ts`'s `EmailTransport` interface is the only
thing `publishChangelogEntry()` depends on. `ResendTransport`
(`lib/email/resend-transport.ts`) wraps the official `resend` npm
package (its bundled type definitions were read directly before
writing any code — `resend.emails.send({ from, to, subject, html,
text }, { idempotencyKey })`, confirming the SDK's own idempotency-key
support, which this project also uses as a second, provider-side layer
of duplicate-send protection). `getEmailTransport()`
(`lib/email/get-transport.ts`) resolves to `ResendTransport` when
`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` are both set, or to an
`UnconfiguredTransport` that only throws when `.send()` is actually
called — never at import or build time. Tests inject
`tests/support/fake-email-transport.ts`'s `FakeEmailTransport`
directly; no test in this suite makes a real network call. Full
reasoning in `DECISIONS.md` D8-002 and D8-005.

## Security tests (all real, against a live Postgres database)

| Requirement | Test | Result |
|---|---|---|
| Only a verified workspace member creates/edits/publishes | `tests/integration/changelog.test.ts` — a draft created with a non-member `createdByUserId` is rejected (`assertAuthorIsMember`) | PASS |
| Tenant A cannot link tenant B posts | `tests/integration/changelog.test.ts` — linking a cross-org post throws | PASS |
| Tenant A cannot see/edit tenant B changelog | `tests/integration/changelog.test.ts` — `getChangelogEntryForOrganization` returns `null` for a cross-org entry; `updateChangelogDraft` on a cross-org entry throws | PASS |
| Draft never public | `tests/integration/changelog.test.ts` — `listPublishedChangelogEntries` excludes a draft before publish and includes it after, for the same entry id; `e2e/changelog.spec.ts` confirms the same end to end | PASS |
| Participant cannot subscribe another raw participant id | By construction — `followAction` never reads a `participantId` from `formData`; it always uses the cookie-resolved (or freshly identified) participant, the same pattern votes/comments already use. `subscribeToPost()` additionally re-verifies the participant belongs to the claimed organization | PASS (by construction + data-layer assertion) |
| Public cannot publish | `e2e/changelog.spec.ts` — unauthenticated visitors are redirected to `/login` before reaching `/changelog`; the public changelog page renders no "New entry"/"Publish" controls at all | PASS |
| Published entry never exposes participant emails | `tests/integration/changelog.test.ts` — asserts the admin detail response contains no email-shaped string | PASS |
| Idempotency: double publish | `tests/integration/changelog.test.ts` — a second publish call on an already-published entry throws; exactly one notification row and one `transport.send()` call exist afterward | PASS |
| Idempotency: subscriber via two linked posts | `tests/integration/changelog.test.ts` — a participant following both of an entry's linked posts receives exactly one notification | PASS |
| Unsubscribed gets zero | `tests/integration/changelog.test.ts` + `e2e/changelog.spec.ts` — a participant with no `post_subscription` row receives no notification and is absent from `transport.sent` | PASS |
| Provider failure recorded, never falsely "sent" | `tests/integration/changelog.test.ts` — a transport configured to throw lands the delivery in `failed` with a truncated reason, `sentAt` stays `null` | PASS |

## Business E2E (`e2e/changelog.spec.ts`)

Full Tier-3 flow, real Postgres, real Playwright, real UI: submit a
request → follow it (inline-identify) → vote and comment as the same
participant → admin marks it `complete` → admin creates a changelog
draft → links the completed request → publishes → public changelog
shows the release with the linked request → the linked request opens
the existing public thread → exactly one delivery record exists (its
state — `sent` vs `failed` — depends honestly on whether this
environment has `RESEND_API_KEY` configured, which CI does not, so the
assertion checks the count and the honest state, not a specific
outcome). Also covered: follow/unfollow toggle and its persistence
across a reload, a draft entry absent from the public changelog, an
unknown board's changelog behaving safely (see "Known limitations"),
an unrecognized/reused unsubscribe token handled gracefully, and
accessibility/responsive checks on both the admin editor and the
public changelog with real data present.

## Tier 1 — Code / Static Quality

**Result: PASS**

| Check | Result |
|---|---|
| RepoGuard (`--base origin/main`) | PASS |
| RepoGuard self-test | PASS — 18 assertions |
| Lint (`npm run lint`) | PASS, 0 errors |
| Type check (`npm run typecheck`) | PASS, 0 errors |

## Tier 2 — Build / Integration

**Result: PASS**

| Check | Result |
|---|---|
| Clean install (`npm ci`) | PASS |
| Production build (`npm run build`) | PASS — with **zero environment variables set** (`env -i`), including no `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS`; `/changelog`, `/changelog/[entryId]`, `/changelog/new`, `/b/[slug]/changelog`, and `/unsubscribe/[token]` all render as dynamic (`ƒ`) routes |
| `drizzle-kit check` | PASS — schema/migration consistent |
| Unit tests (`npm run test`, Vitest) | PASS — 65/65 (51 prior + 14 new: `validation-changelog.test.ts`, `email-templates.test.ts`) |

## Tier 3 — Runtime / End-to-End

**Result: PASS**

Real running app, real Postgres database (local Postgres 16),
Playwright against the built-and-launched app, `CI=true`.

- **Integration tests** (`npm run test:integration`, real database):
  **30/30 PASS** — the 6 pre-existing files plus 3 new files:
  `changelog-smoke.test.ts` (1 test), `changelog.test.ts` (10 tests),
  `post-subscription.test.ts` (4 tests).
- **Playwright**: **98/98 PASS** across both device projects
  (desktop-chromium, mobile-chromium), run with `--retries=0` (no
  masking) — the full pre-existing regression suite (auth, shell,
  feedback, comments, status, roadmap) plus 9 new tests in
  `e2e/changelog.spec.ts` × 2 projects.

## Automated review findings

None yet — this report covers local validation before the PR is
opened; any review findings from the PR itself will be addressed and
recorded in an addendum before merge, following this project's
established pattern (see the M6/M7 reports' own review-finding
sections).

## Failures discovered (and fixed, in the order found)

1. **A missing compound-write hardening gap, closed before it could
   become one.** `createChangelogDraft()`'s `createdByUserId` was
   initially trusted without verification. Following this project's
   established D5-003 precedent (every authored write re-verifies its
   author is a current organization member), added
   `assertAuthorIsMember()` to `createChangelogDraft()` before writing
   any test against it.
2. **A genuine, reproducible bug — the same class as D6-003, recurring
   despite having just documented it.** `listCompletablePosts()`'s
   `linked` flag was first written as a raw `sql` template with
   `${changelogEntryPost.postId}`/`${post.id}` interpolated directly.
   Because `changelog_entry_post` (the subquery's own `FROM` table)
   has its own `id` primary key, the unqualified `${post.id}` inside
   the template resolved to `changelog_entry_post.id`, not the outer
   post — the subquery compared `changelog_entry_post.post_id` to
   `changelog_entry_post.id`, which is never true, so `linked` was
   `false` for every post regardless of real state. Not caught by
   `tsc`, lint, the unit suite, or the first version of the
   integration suite (which only asserted *exclusion* of non-`complete`
   posts, never a positive `linked: true` case) — caught by a real
   Playwright failure while writing this milestone's own E2E coverage
   (clicking "Link" never showed "Unlink"). **Fixed** by rebuilding
   the subquery with the query builder's own `exists()` + `eq()`, the
   same pattern D6-003 established. Added the missing positive
   integration test case (asserts `false` → `true` → `false` across
   link/unlink) so this exact regression can't recur silently. Full
   detail in `DECISIONS.md` D8-006, which also states this is now a
   standing rule for every subquery in this codebase, not a
   case-by-case fix.

No test, guard, or check was skipped, weakened, or marked `NOT
APPLICABLE` to obtain a passing result.

## Security observations

See `SECURITY.md`'s "Current status (as of M8)" section for the full
picture. Summary: every changelog write is tenant-scoped independently
at the data layer; the link rule and publish-time revalidation are
enforced there too, not just in the admin UI; consent for email is
never inferred from an unrelated action; delivery is idempotent by
construction and never falsely reports success; and no email or
notification content is exposed through any read path a customer or
another tenant could reach.

## Known limitations

- **`/b/[slug]/changelog`'s unknown-board case doesn't produce a
  literal HTTP 404 status** — the same pre-existing Cache Components
  streaming characteristic `DECISIONS.md` D7-002 documents for the
  roadmap and board pages; verified safe (root not-found UI, no data
  leak) rather than a literal status code this Next.js version can't
  produce at that point in the request lifecycle. Not a regression
  introduced by M8.
- **No changelog-entry unpublish or delete** — deliberate (M8's
  "cannot be unpublished" instruction); a mis-published entry cannot
  currently be retracted through the product.
- **No retry mechanism for a `failed` notification delivery** — an
  admin sees the failure and reason but has no button to re-attempt
  it; re-publishing is impossible (the entry is already `published`)
  and a manual DB fix would be required today. Acceptable at this
  scale per M8's explicit "no queue/worker" instruction; worth
  revisiting if delivery failures prove common in practice.
- **No pagination on the public changelog or the admin list** — fine
  at current scale; same caveat carried since M4.
- The drizzle-kit dev-only `esbuild` advisory noted in prior reports
  remains open (no fixed stable release yet); unchanged this
  milestone. `resend`'s own dependency tree introduced no new
  vulnerabilities (`npm audit` after installing it shows the same 4
  pre-existing moderate advisories, all against `drizzle-kit`'s
  `esbuild`).
- `feedback-ci.yml`'s Tier 3 job runs the integration-test tier against
  its `postgres:16` service container; this milestone's local
  validation used a locally-running Postgres 16 instance for
  equivalent (not identical-environment) coverage — the actual GitHub
  Actions run should be confirmed green on the PR before merge (see
  the final report for live status). CI also has no `RESEND_API_KEY`
  configured, which is expected and intentional — it exercises the
  honest "email not configured" path, not a masked failure.

## Final `git status`

```
On branch claude/feedback-m8-changelog-close-loop
nothing to commit, working tree clean
```

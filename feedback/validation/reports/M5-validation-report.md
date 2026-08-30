# Validation Report — M5: Feedback Detail & Comments

- **Milestone ID:** M5
- **Objective:** Complete the basic Canny-style discussion loop — a
  public feedback detail/thread page, a distinct Comment entity,
  external customer replies (reusing M4's participant identity), and
  public replies from authenticated workspace members, clearly
  distinguished visually. No private/internal notes, no moderation.
- **Repository:** `askgeniebhai/hamix`
- **Branch:** `claude/feedback-m5-comments`
- **Starting SHA:** `313c15ed1dd983651fb0a99c72bb72bfa2e0c8c3` (tip of
  `main` immediately after PR #26 / M4 merged)
- **Ending SHA:** see the PR's final head commit (this report and the
  governance-doc updates land in a follow-up commit on the same
  branch, after the application code at
  `3cf6a53cb81f4e3068d43c25a6a36ecb8241905e`)
- **Files changed:** new `comment` domain table + migration
  (`lib/db/feedback-schema.ts`, `drizzle/0002_noisy_arachne.sql`),
  extended data access (`lib/feedback/data.ts`), the public detail
  page and its actions (`app/b/[slug]/p/[postId]/`), the admin thread
  page and its actions (`app/(workspace)/feedback/[postId]/`), new
  shared components (`components/feedback/comment-thread.tsx`,
  `add-comment-form.tsx`, `internal-reply-form.tsx`), the `Badge` UI
  primitive, updated list pages/links, a new database-backed
  integration test, unit tests, and `e2e/comments.spec.ts`.

## Schema / migration

Hand-written `comment` table: `id`, `organization_id`, `post_id`,
`participant_id` (nullable), `author_user_id` (nullable), `body`,
`created_at`. A Postgres `CHECK` constraint
(`comment_exactly_one_author_chk`) requires exactly one of
`participant_id`/`author_user_id` to be set — enforced by the
database, not just application code (`DECISIONS.md` D5-001). Migration
`drizzle/0002_noisy_arachne.sql`, applied and verified against real
local Postgres 16 and (via CI) the `postgres:16` service container.

## Public thread flow

- **Detail page** (`/b/[slug]/p/[postId]`, public): title,
  description, the same `VoteControl` used on the board list, submitter
  name, created date, the comment thread, and the add-comment form.
  Post list pages (`/b/[slug]`, `/feedback`) now link each title to
  this page and show a comment count.
- **Commenting as an external participant:** if the browser already
  carries this organization's participant cookie (from a prior
  submission or vote), commenting is a single textarea + submit — no
  re-identification. A brand-new visitor sees the same inline
  name/email step M4's vote control uses; the resulting identity is
  then remembered for the rest of that browser's visit, including for
  later comments and votes.
- **Comment thread:** oldest-first, shared component
  (`CommentThread`) used by both the public and admin pages. Team
  replies get a `Badge` ("Team") and a subtly tinted card; customer
  replies are plain — visually distinct without turning the thread
  into a noisy forum, per the milestone's design directive.

## Internal reply flow

- **Admin thread view** (`/feedback/[postId]`, protected): full post
  detail (including submitter email, which the public page
  deliberately omits) plus the comment thread and a reply form.
- Any authenticated member of the active organization can post a
  public reply — `requireActiveOrganization()` is the entire
  membership check (`DECISIONS.md` D5-002); there is no additional
  role restriction, since M5 didn't ask for one.
- A reply's `author_user_id` always comes from the verified session
  (`session.user.id`), never from submitted form data.

## Tenant / security tests (all real, against a live Postgres database)

| Requirement | Test | Result |
|---|---|---|
| Tenant A comment never visible in tenant B | `e2e/comments.spec.ts` — tenant B's board/admin views never show tenant A's post or comment | PASS |
| Tenant A participant cannot comment on tenant B post | `tests/integration/comment-author-constraint.test.ts` — `createExternalComment` against a cross-org `postId` throws | PASS |
| Non-member cannot use internal-author identity | `e2e/comments.spec.ts` — an authenticated non-member visiting another org's thread URL gets a 404, never the reply form; `tests/integration/comment-author-constraint.test.ts` — `createInternalComment` against a cross-org `postId` throws | PASS |
| Invalid/empty/oversized comment rejected | `e2e/comments.spec.ts` — server-side rejection with native validation bypassed (empty and >2000 chars) | PASS |
| Raw author IDs cannot be spoofed | By construction — neither server action reads a participant/author id from `formData`; `authorUserId` always comes from the verified session, `participantId` always from the cookie-resolved (or freshly identified) participant. The exclusivity CHECK constraint is the backstop even against a bug, not the only guard. | Verified by code inspection + `tests/integration/comment-author-constraint.test.ts` |
| Full public/internal thread lifecycle | `e2e/comments.spec.ts` — submit → open → comment → reload persists → internal reply → public visitor sees both → admin sees thread | PASS |
| Comment without prior identification | `e2e/comments.spec.ts` — inline identify-then-comment, remembered afterward | PASS |
| Unauthenticated cannot reach admin thread | `e2e/comments.spec.ts` + `/feedback/:path*` already covered by `proxy.ts`'s matcher | PASS |
| Accessibility + responsive | Public and admin detail pages, with a comment present — zero axe violations, zero horizontal overflow | PASS |

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
| Production build (`npm run build`) | PASS — with **zero environment variables set**; `/b/[slug]/p/[postId]` and `/feedback/[postId]` both render as dynamic (`ƒ`) routes |
| `drizzle-kit check` | PASS — schema/migration consistent |
| Unit tests (`npm run test`, Vitest) | PASS — 39/39 (31 from M4 + 8 new: `lib/validation/feedback.ts`'s `commentBodySchema`/`addCommentSchema`) |

## Tier 3 — Runtime / End-to-End

**Result: PASS**

Real running app, real Postgres database (local Postgres 16 for this
report; a `postgres:16` GitHub Actions service container in CI),
Playwright against the built-and-launched app, plus the integration
test tier introduced in M4.

- **Integration tests** (`npm run test:integration`, real database):
  **3/3 PASS** — M4's vote-race test, plus two new tests in
  `tests/integration/comment-author-constraint.test.ts` (the
  author-exclusivity CHECK constraint; cross-tenant
  `createExternalComment`/`createInternalComment` rejection).
- **Playwright**: **56/56 PASS** across both device projects
  (desktop-chromium, mobile-chromium) — the existing 46 M3/M4 tests
  plus 10 new tests in `e2e/comments.spec.ts` (full thread lifecycle,
  inline-identify commenting, invalid/oversized rejection, tenant/
  non-member rejection, accessibility/overflow) × 2 projects, minus
  the tests that assert once rather than per-project (health check,
  etc.) — see the suite's own output for the exact per-project
  breakdown.

## Failures discovered (and fixed, in the order found)

1. **My own smoke-test script raced past a client-side navigation.**
   Manually verifying the flow before writing automated tests, a
   script clicked a post's title link and immediately checked
   `document.querySelector('h1')` — which matched instantly because
   the board *list* page's own `<h1>` (the workspace name) was still
   in the DOM, before the click's navigation to the detail page had
   actually completed. Not an app bug — confirmed by adding an
   explicit `waitForURL` before checking, which passed immediately.
   Fixed in the throwaway script only (not part of the committed
   diff); recorded here because it's the same *class* of mistake as
   the two real test flakes below, which the fix pattern anticipated.
2. **Playwright: `.fill()` on a `maxlength`-limited textarea silently
   truncates input**, so my own "oversized comment" negative test
   couldn't actually submit more than 2000 characters to prove the
   *server's* limit (the textarea's native `maxlength` attribute
   truncates at the DOM level regardless of the form's `noValidate`).
   **Fix:** set the textarea's `.value` directly via
   `locator.evaluate()` instead of `.fill()`, bypassing the attribute
   the same way a non-browser client (e.g. a raw HTTP request) would,
   which is the actual case this test needs to cover.
3. **A genuine, if narrow, accessibility-scan race**, introduced by
   this milestone's own query changes. `AxeBuilder().analyze()` is a
   one-shot DOM snapshot (unlike Playwright's own `expect(locator)`
   assertions, which retry); `listBoardPosts()`/
   `listOrganizationPostsForAdmin()` both gained an extra `leftJoin`
   for comment counts, making the underlying queries measurably
   heavier. Under CI-representative load, a scan could occasionally
   run before the async page component's Suspense boundary resolved,
   landing on the route's `loading.tsx` skeleton (no `<h1>`,
   sometimes no `<title>`) — the same class of flake fixed for a
   different page in M3. Reproduced deterministically enough to
   diagnose (occasional under parallel load, never in isolation, so
   genuinely load-sensitive, not a hard defect), then fixed at the
   root: (a) `e2e/helpers.ts`'s `openPostDetail()` now waits for
   `document.title` to include the expected title, not just the
   visible heading, before returning; (b) the pre-existing M4 test
   `e2e/feedback.spec.ts`'s accessibility check now waits for the
   board/admin heading before each scan, matching the pattern already
   used elsewhere. Verified stable across repeated runs (6/6 and 4/4
   repeats, plus a full-suite run with zero retries) after the fix;
   an occasional single retry under heavy parallel load in this
   sandboxed environment remains possible and is exactly what CI's
   existing `retries: 1` policy exists to absorb — not a
   masked defect.

No test, guard, or check was skipped, weakened, or marked `NOT
APPLICABLE` to obtain a passing result.

## Security observations

See `SECURITY.md`'s "Current status (as of M5)" section for the full
picture. Summary: comment tenant isolation and author-identity
integrity are both proven at the database layer (a real CHECK
constraint, not just application logic) as well as exercised
end-to-end against real product data — the same evidentiary bar M4 set
for votes, now extended to comments.

## Known limitations

- **No rate limiting on comment submission**, same accepted gap as
  M4's vote/submission endpoints (see the M4 report's "Known
  limitations" and `SECURITY.md`).
- **No email verification for participants** — unchanged from M4,
  applies equally to commenting.
- **No comment editing, deleting, or moderation** — explicitly out of
  M5's scope; a mis-posted comment (customer or team) cannot currently
  be corrected or removed by anyone through the product.
- **No pagination on the comment thread** — fine at M5's scale, same
  caveat as M4's post lists.
- **No notification when a reply is posted** — a customer who
  commented has no way to learn a team member replied except by
  revisiting the page; explicitly out of scope ("notifications" is on
  M5's do-not-build list).
- **Any authenticated member can reply as "the team"** — no
  role-gating (e.g. restricting replies to owner/admin roles). M5's
  instruction only said "authenticated workspace members," not a
  specific role, so this is a deliberate scope match, not an oversight
  — worth flagging in case a future milestone wants finer-grained
  permissions.
- The drizzle-kit dev-only `esbuild` advisory noted in prior reports
  remains open (no fixed stable release yet); unchanged this
  milestone.
- `feedback-ci.yml`'s Tier 3 job runs the integration-test tier
  (unchanged from M4, now covering the new comment-constraint tests
  too) against its `postgres:16` service container; this milestone's
  local validation used a locally-running Postgres 16 instance for
  equivalent (not identical-environment) coverage — the actual GitHub
  Actions run should be confirmed green on the PR before merge (see
  the final report for live status).

## Final `git status`

```
On branch claude/feedback-m5-comments
Your branch is ahead of 'origin/main' by 2 commits.

nothing to commit, working tree clean
```

## Addendum — post-merge hardening pass (`claude/feedback-m5-hardening`)

PR #27 (this milestone) was reviewed and merged (SHA
`37db7a95547c4045f80aa5ae20b45563ce6349b0`) before a Product Owner
hardening request arrived. Since the merge had already happened, the
requested hardening was delivered as its own follow-up branch/PR
(`claude/feedback-m5-hardening`) against `main`, rather than folded
into this milestone's original PR — recorded here, against this
report, because the change is entirely to code this milestone (and
M4) introduced.

**What changed:** every domain write in `lib/feedback/data.ts` now
re-verifies every id it's handed against the claimed organization —
not just `postId` (which M4/M5 already checked), but also
`boardId`/`participantId` (`createPost`), `participantId`
(`castVote`, `createExternalComment`), and membership of
`authorUserId` (`createInternalComment`). See `DECISIONS.md` D5-003
for the full reasoning and what was rejected.

**Why this wasn't a gap in the shipped product:** every real caller
(the server actions in `app/b/[slug]/actions.ts`,
`app/b/[slug]/p/[postId]/actions.ts`, and
`app/(workspace)/feedback/[postId]/actions.ts`) already only ever
passed ids it resolved server-side itself within the same
organization — a participant identified via a per-organization
cookie, or `session.user.id` from `requireActiveOrganization()`. No
existing code path could construct the cross-organization
combinations the new tests check. This is defense-in-depth for future
callers, verified directly rather than left as an unstated invariant.

**Evidence:** `tests/integration/tenant-hardening.test.ts` — 4 new
tests (one per hardened write, each with a same-organization control
case proving the legitimate path is unaffected). Full Tier 1/2/3 —
including the complete pre-existing Playwright suite (56/56) and both
prior integration-test files — re-run against the hardened code with
no regressions. Tier 1 (RepoGuard, lint, typecheck), Tier 2 (build
with zero env vars, `drizzle-kit check`, Vitest), and Tier 3
(integration + Playwright, real Postgres) results are in the
hardening PR itself; this addendum records the outcome against the
milestone the change belongs to.

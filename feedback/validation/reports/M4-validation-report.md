# Validation Report — M4: Feedback Submission & Voting

- **Milestone ID:** M4
- **Objective:** The smallest complete Canny-style public workflow —
  a public feedback portal, submission, voting/unvoting with
  database-enforced uniqueness, and a minimal admin view — on top of
  M3's tenant-scoped authentication/workspace foundation. `Post` and
  `Comment` remain distinct entities; no comment table or UI.
- **Repository:** `askgeniebhai/hamix`
- **Branch:** `claude/feedback-m4-submission-voting`
- **Starting SHA:** `97e66a8d765ddc03886d829dfd8a58d76d6bb41f` (tip of
  `main` immediately after PR #25 / M3 merged)
- **Ending SHA:** see the PR's final head commit (this report and the
  governance-doc updates land in a follow-up commit on the same
  branch, after the application code at
  `c94c9747f3e6654ce02af12dba137ea0a9021a85`)
- **Files changed:** application code under `app/b/`,
  `app/(workspace)/feedback/`, `components/feedback/`,
  `lib/db/feedback-schema.ts`, `lib/feedback/`,
  `lib/validation/feedback.ts`, the new migration
  (`drizzle/0001_panoramic_wild_child.sql`), the
  `afterCreateOrganization` board hook (`lib/auth/index.ts`), proxy
  matcher and sidebar/dashboard updates, a new `tests/integration/`
  tier, E2E/unit tests, and `feedback-ci.yml`.

## Schema / migrations

Hand-written (no CLI generator involved, unlike the Better Auth
schema): `board`, `participant`, `post`, `vote` — exactly the four
entities M4's instruction named, matching
`docs/M1_ARCHITECTURE_DECISION.md`'s conceptual Board/Post/Vote shape
plus the external-participant identity it called "TrackedUser",
scoped down to what M4 needs (no billing/usage fields). Every table
carries its own `organization_id`. Two structurally-enforced
invariants, not just application-level checks:

- `board.slug` — globally unique (`board_slug_uidx`), since the public
  route `/b/[slug]` has no other tenant identifier in it.
- `vote (post_id, participant_id)` — globally unique
  (`vote_post_participant_uidx`), the actual mechanism preventing a
  duplicate vote, proven race-safe under real concurrency (see
  "Tier 3" below).

Migration `drizzle/0001_panoramic_wild_child.sql`, applied and
verified against real local Postgres 16 and (via CI) the `postgres:16`
service container. `lib/auth/index.ts`'s new
`organizationHooks.afterCreateOrganization` hook creates each
organization's one board atomically, in the same request that creates
the organization (`DECISIONS.md` D4-001) — not a separate step a
future code path could forget.

## Public feedback flow

- **Portal** (`/b/[organization-slug]`, public, no auth): lists posts
  with vote counts, a submit-feedback form (title, description, name,
  email — `lib/validation/feedback.ts`'s `submitFeedbackSchema`), and
  a vote control per post.
- **Submission**: identifies (or creates) the participant by
  (organization, email) and sets an HttpOnly, per-organization
  identity cookie (`lib/feedback/participant.ts`), then creates the
  post. No board/session state is trusted from the client beyond the
  slug in the URL — `getBoardBySlug()` is the one place a request's
  organization is resolved.
- **Voting**: if the visitor's browser already carries this
  organization's participant cookie, one click votes; if not, the
  vote control reveals an inline name/email step (identify-then-vote
  in one action) so a first-time voter never has to submit feedback
  first just to be recognized. Either way, the resulting identity is
  remembered for the rest of that browser's visit to this
  organization's board.
- **Unvoting**: the same control toggles to "remove vote" once voted;
  removes the vote row scoped to (post, participant, organization).

## Admin flow

`/feedback` (protected, inside the existing `(workspace)` layout):
`requireActiveOrganization()` resolves the caller's organization, then
`listOrganizationPostsForAdmin()` shows every real submitted post for
that organization's board — title, description, vote count, and
submitter name/email — plus a link to the organization's own public
board URL. Empty state when nothing has been submitted yet. Added to
`proxy.ts`'s matcher and the sidebar's primary navigation (moved out
of "Coming soon").

## Vote integrity

| Requirement | How it's met | Evidence |
|---|---|---|
| One participant = one vote per post | `vote_post_participant_uidx` unique index | `tests/integration/vote-race.test.ts` |
| Vote can be removed | `removeVote()`, scoped to (post, participant, organization) | `e2e/feedback.spec.ts` full-flow test |
| Count persists correctly | Server-computed `COUNT(DISTINCT vote.id)` per post, not client state | Full-flow test's reload assertion |
| Race-safe / database-enforced uniqueness | Two concurrent `castVote()` calls against a real database produce exactly one row | `tests/integration/vote-race.test.ts` (new Tier 3 integration tier — see D4-002) |
| Cannot vote across tenants | `castVote()` re-verifies `post.organization_id` before inserting; participant identity is itself scoped per organization | `e2e/feedback.spec.ts`'s tenant-isolation test |

## Security / tenant tests (all real, against a live Postgres database)

| Requirement | Test | Result |
|---|---|---|
| Duplicate vote prevented | `tests/integration/vote-race.test.ts` | PASS |
| Tenant A feedback never visible in tenant B | `e2e/feedback.spec.ts` — B's board and B's admin view never show A's post | PASS |
| Tenant A participant cannot affect tenant B vote/post | Same test — A's post id is never reachable from B's org context | PASS |
| Invalid submission rejected (server-side) | `e2e/feedback.spec.ts` — native validation bypassed, server still rejects a too-short title | PASS |
| Unauthenticated user cannot access admin routes | `e2e/feedback.spec.ts` + `/feedback` added to `e2e/auth.spec.ts`'s protected-route list | PASS |
| Full public lifecycle | submit → appears → vote (count 1) → reload persists → unvote (count 0) → admin sees it | PASS |
| Vote without prior submission | Inline identify-then-vote path, identity remembered after reload | PASS |
| Accessibility + responsive | Portal (empty and with a post) and admin view — zero axe violations, zero horizontal overflow | PASS |

## Tier 1 — Code / Static Quality

**Result: PASS**

| Check | Result |
|---|---|
| RepoGuard (`--base origin/main`) | PASS |
| RepoGuard self-test | PASS — 18 assertions |
| Lint (`npm run lint`) | PASS, 0 errors (added an `argsIgnorePattern: "^_"` override for `useActionState`'s fixed `(prevState, formData)` signature — some actions don't need both) |
| Type check (`npm run typecheck`) | PASS, 0 errors |

## Tier 2 — Build / Integration

**Result: PASS**

| Check | Result |
|---|---|
| Clean install (`npm ci`) | PASS |
| Production build (`npm run build`) | PASS — with **zero environment variables set** (`.env.local` removed for this check); `/b/[slug]` and `/feedback` both render as dynamic (`ƒ`) routes, confirming the D3-005 lesson (call dynamic APIs before any lazily-constructed env/db/auth singleton) held for all new routes |
| `drizzle-kit check` | PASS — schema/migration consistent |
| Unit tests (`npm run test`, Vitest) | PASS — 31/31 (20 from M3 + 11 new: `lib/validation/feedback.ts`'s schemas) |

## Tier 3 — Runtime / End-to-End

**Result: PASS**

Real running app, real Postgres database (local Postgres 16 for this
report; a `postgres:16` GitHub Actions service container in CI),
Playwright against the built-and-launched app, plus a new
database-backed integration-test tier.

- **Integration tests** (`npm run test:integration`, real database):
  **1/1 PASS** — the vote-race test above.
- **Playwright**: **46/46 PASS** across both device projects
  (desktop-chromium, mobile-chromium) — the existing 34 M3 tests (one
  extended to also check `/feedback`'s protection) plus 12 new tests
  in `e2e/feedback.spec.ts` (full public flow, inline-identify voting,
  accessibility/overflow, invalid submission, unauthenticated admin
  access, cross-tenant isolation) × 2 projects.

## Failures discovered (and fixed, in the order found)

1. **ESLint flagged `useActionState`'s required but sometimes-unused
   `(prevState, formData)` action parameters** as unused variables.
   **Fix:** added an `argsIgnorePattern: "^_"` rule override in
   `eslint.config.mjs`, documented inline as intentional for this
   exact pattern, not a blanket suppression.
2. **`server-only`'s marker package throws when imported outside
   Next.js's `react-server` build condition**, which broke the new
   `tests/integration/` tier (it imports `lib/db`/`lib/feedback`,
   both marked `server-only`). Confirmed `vitest.config.ts`'s `resolve
   .conditions` doesn't reach Vitest's SSR module graph. **Fix:**
   `vitest.integration.config.ts` aliases `server-only` directly to
   its own no-op `empty.js` — the same file Next.js's build resolves
   it to under that condition, not a workaround around the package's
   intent.
3. **`getByRole("alert")` in the new "invalid submission" E2E test
   matched two elements on mobile-chromium**: the feedback form's own
   error `Alert` and Next.js's `role="alert"` route-announcer element,
   a real Playwright strict-mode collision only reproducible with the
   mobile viewport's timing in this run. **Fix:** matched the specific
   validation-error text instead of the generic `alert` role.

No test, guard, or check was skipped, weakened, or marked `NOT
APPLICABLE` to obtain a passing result.

## Security observations

See `SECURITY.md`'s "Current status (as of M4)" section for the full
picture. Summary: tenant isolation, server-side input validation, and
session/cookie handling are now exercised against real product data
(not just the auth/workspace data M3 covered), and this milestone adds
a new category — data-integrity-under-concurrency — verified with a
dedicated integration test rather than assumed from
`onConflictDoNothing()`'s presence alone.

## Known limitations

- **No rate limiting on public submission/voting endpoints.** Better
  Auth's limiter (D3-004) only covers Better Auth's own routes,
  not the new feedback Server Actions. The one correctness issue
  unlimited requests could otherwise cause — a participant voting more
  than once — is prevented by the database unique constraint
  regardless; volumetric abuse protection (e.g. spam submissions) is
  deferred to a future milestone, flagged here rather than silently
  assumed covered.
- **No email verification for participants.** Anyone can submit
  feedback or vote as any email address they type — consistent with
  typical public feedback-board UX (no login required to participate)
  and with M3's own precedent (`requireEmailVerification` is off for
  workspace signup too), but worth stating plainly since it means
  vote counts reflect "one vote per claimed email," not "one vote per
  verified person."
- **No pagination on the portal or admin post lists.** Fine at M4's
  scale; will need addressing once a board realistically accumulates
  hundreds of posts.
- **Vote sort order is vote-count-desc, then newest-first** — a
  reasonable default, not a configurable "Trending/Top/New" control
  (out of M4's "smallest complete workflow" scope).
- The drizzle-kit dev-only `esbuild` advisory noted in the M2/M3
  reports remains open (no fixed stable release yet); unchanged this
  milestone.
- `feedback-ci.yml`'s Tier 3 job now also runs the new integration
  test tier against its `postgres:16` service container; this
  milestone's local validation used a locally-running Postgres 16
  instance for equivalent (not identical-environment) coverage — the
  actual GitHub Actions run should be confirmed green on the PR before
  merge (see the final report for live status).

## Final `git status`

```
On branch claude/feedback-m4-submission-voting
Your branch is ahead of 'origin/main' by 2 commits.

nothing to commit, working tree clean
```

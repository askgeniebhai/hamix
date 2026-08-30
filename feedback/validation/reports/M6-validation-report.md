# Validation Report — M6: Feedback Status & Admin Management

- **Milestone ID:** M6
- **Objective:** A flat, admin-only post status lifecycle
  (Open/Under Review/Planned/In Progress/Complete, DB-enforced,
  tenant-scoped), an improved admin `/feedback` triage view
  (database-side search/filter/sort, vote/comment counts, submitter),
  and a performance fix to the vote/comment count queries M4/M5
  introduced — no roadmap UI, no workflow engine, no public-facing
  status control.
- **Repository:** `askgeniebhai/hamix`
- **Branch:** `claude/feedback-m6-status-management`
- **Starting SHA:** `159d49cb3790d5de57825e3d8db9a96446e1531e` (tip of
  `main` after PR #28, the M5 hardening pass, merged)
- **Ending SHA:** see the PR's final head commit
- **Files changed:** new status model
  (`lib/feedback/status.ts`), schema/migration
  (`lib/db/feedback-schema.ts`,
  `drizzle/0003_perfect_machine_man.sql`), extended validation
  (`lib/validation/feedback.ts`), a substantially rewritten data-access
  module (`lib/feedback/data.ts` — status reads/writes, and the
  vote/comment count performance fix), new UI
  (`components/feedback/status-badge.tsx`,
  `components/feedback/status-select.tsx`,
  `components/feedback/admin-feedback-filters.tsx`,
  `components/ui/select.tsx`), updated pages/actions (admin `/feedback`
  and `/feedback/[postId]`, public `/b/[slug]` and
  `/b/[slug]/p/[postId]`), new unit/integration tests, and
  `e2e/status.spec.ts`.

## Schema / migration

`post` gained two columns: `status` (a real Postgres enum
`post_status` — `open`/`under_review`/`planned`/`in_progress`/
`complete`, `NOT NULL DEFAULT 'open'`) and `status_changed_at`
(`timestamp NOT NULL DEFAULT now()`), plus a `post_status_idx` index on
`status`. Migration `drizzle/0003_perfect_machine_man.sql`, applied and
verified against real local Postgres 16. `lib/feedback/status.ts` is
the single source of truth for the value list, labels, and Zod schema
(`postStatusSchema`) — kept in sync with the Drizzle `pgEnum` by hand,
since Drizzle requires the two to be declared separately
(`DECISIONS.md` D6-001).

## Status lifecycle

- Every new post defaults to `open`. An admin changes status from the
  protected thread view (`/feedback/[postId]`) via `StatusSelect`, a
  client component that calls `updateStatusAction` and optimistically
  updates, rolling back on error.
- `updateStatusAction` requires `requireActiveOrganization()`, then
  `updatePostStatus()` independently re-verifies the post belongs to
  that organization (`assertPostInOrganization`) before writing — the
  same pattern every other write in `lib/feedback/data.ts` uses.
  Neither the organization id nor the post's current state is ever
  trusted from client input.
- `status` and `statusChangedAt` are updated together, atomically, by
  a single `UPDATE … SET status = $1, status_changed_at = CASE WHEN
  status = $1 THEN status_changed_at ELSE now() END` — no
  read-then-write race, and a "change" to the same status is a true
  no-op for the timestamp (`DECISIONS.md` D6-001).
- Public board (`/b/[slug]`) and detail (`/b/[slug]/p/[postId]`) pages
  render `StatusBadge` (read-only) — no status-changing control exists
  on either page.

## Admin triage view

`/feedback` now supports search (title/description, `ilike`), status
filter, and three-way sort (newest/most votes/most comments), all
expressed as URL search params (`?q=&status=&sort=`) read
server-side and pushed into `listOrganizationPostsForAdmin()`'s
`WHERE`/`ORDER BY` — never a full list loaded into the browser and
filtered client-side. `AdminFeedbackFilters` (client component)
debounces the search box (350ms) before navigating; the two `Select`
controls navigate immediately. Each list item shows a `StatusBadge`,
vote count, comment count, and submitter. Empty states are
differentiated: "No feedback yet" when the board has no posts at all,
"No matching feedback" when filters are active and match nothing.

## Performance fix

`listBoardPosts()`, `listOrganizationPostsForAdmin()`,
`getPostForBoard()`, and `getPostForOrganization()` previously counted
votes and comments via `leftJoin` + `count(distinct …)` + `groupBy` —
joining two independent one-to-many relations onto the same post row
multiplies it by both counts before `GROUP BY` collapses the result
back down. All four now use per-post scalar correlated subqueries
(`voteCountSubquery()`, `commentCountSubquery()`,
`votedByViewerSubquery()`), backed by the existing `post_id` indexes on
both tables, with no join and no row fan-out (`DECISIONS.md` D6-002).

**A real bug was found and fixed in this same work before it shipped**
(`DECISIONS.md` D6-003): the first version of these subqueries used a
raw `sql` template with `${post.id}` interpolated directly, which
Drizzle renders as the unqualified identifier `"id"` — inside a
subquery whose own `FROM` table (`vote`/`comment`) also has an `id`
column, that unqualified reference silently resolved to the *inner*
table's `id`, not the outer post's. Every post's vote count and
viewer-vote state read as `0`/`false` regardless of real data. Caught
by a full Playwright run surfacing two pre-existing M4 tests
(`e2e/feedback.spec.ts`) failing at the "vote button flips to Remove
your vote" assertion; root-caused by reproducing directly against
local Postgres (inserted a real vote, showed the buggy subquery
returning `0`, showed the query-builder-based fix returning `1`), then
applied to `lib/feedback/data.ts`. See below and "Failures discovered."

## Tenant / security tests (all real, against a live Postgres database)

| Requirement | Test | Result |
|---|---|---|
| Tenant B cannot change tenant A's status | `tests/integration/status-update.test.ts` — cross-org `updatePostStatus` rejects, status unchanged | PASS |
| Unauthenticated cannot change status | `e2e/status.spec.ts` — public pages render no `combobox` named "Change status"; `updateStatusAction` requires `requireActiveOrganization()` by construction | PASS |
| Invalid status rejected | `tests/integration/status-update.test.ts` — Postgres enum itself rejects a value bypassing the `PostStatus` type via `as never`; `updateStatusSchema` (Zod) rejects it first at the action boundary | PASS |
| Valid status persists (survives reload) | `e2e/status.spec.ts` — change to Planned, `page.reload()`, still Planned, both admin and public | PASS |
| Public cannot mutate | `e2e/status.spec.ts` "status security" test — unauthenticated visitor, cookies cleared, both `/b/[slug]` and `/b/[slug]/p/[postId]` expose zero status controls | PASS |
| statusChangedAt semantics | `tests/integration/status-update.test.ts` — a real change advances it, a same-status "change" leaves it byte-identical | PASS |
| Search/filter/sort correctness | `e2e/status.spec.ts` — search finds by title, status filter narrows/excludes correctly with a matching empty state, sort-by-votes and sort-by-comments both order correctly | PASS |
| Hardened M5 identity tests remain green | `tests/integration/tenant-hardening.test.ts`, `comment-author-constraint.test.ts` unchanged, re-run — 11/11 integration tests pass together | PASS |
| Accessibility + responsive | Admin filters/list with a post present — zero axe violations, zero horizontal overflow | PASS |

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
| Production build (`npm run build`) | PASS — with **zero environment variables set** |
| `drizzle-kit check` | PASS — schema/migration consistent |
| Unit tests (`npm run test`, Vitest) | PASS — 51/51 (43 prior + 8 new: `tests/unit/validation-status.test.ts`) |

## Tier 3 — Runtime / End-to-End

**Result: PASS**

Real running app, real Postgres database (local Postgres 16),
Playwright against the built-and-launched app.

- **Integration tests** (`npm run test:integration`, real database):
  **11/11 PASS** — the 3 pre-existing files (vote-race,
  comment-author-constraint, tenant-hardening) plus 4 new tests in
  `tests/integration/status-update.test.ts`.
- **Playwright**: **64/64 PASS** across both device projects
  (desktop-chromium, mobile-chromium, `CI=true`) — the full
  pre-existing suite (auth, shell, feedback, comments) plus 4 new
  tests in `e2e/status.spec.ts` × 2 projects, minus tests that assert
  once rather than per-project.

## Failures discovered (and fixed, in the order found)

1. **Stray local-only migration application, out of sync with committed
   history.** While first iterating on the schema, a migration adding
   only `status` (no `statusChangedAt`) was generated and applied to
   the local dev database, then deleted before being committed once
   `statusChangedAt` was added to the design. The local database still
   physically had the column/enum/index from that stray application.
   **Fix:** manually rolled the local database back to match committed
   migration history, then regenerated and reapplied a single correct
   migration (`0003_perfect_machine_man.sql`) with both columns
   together.
2. **A TypeScript mismatch in `StatusSelect`**: the change handler was
   typed `(value: string) => void`, but Base UI's `Select`
   `onValueChange` is generically inferred as
   `(value: PostStatus | null, eventDetails) => void` from the
   `value`/`SelectItem value` props actually used. **Fix:** retyped the
   handler to `(next: PostStatus | null) => void` with an early
   `if (!next) return;` guard.
3. **Playwright strict-mode violation caused by Base UI's Select
   popup staying mounted after close.** On the admin thread page,
   `page.getByText("Under Review"/"Planned", { exact: true })` matched
   two elements: the visible `StatusBadge` text inside the select
   trigger, and an apparently-still-mounted (closed but not removed —
   presumably for exit-animation support) popup list item with
   identical text. **Fix:** scoped those specific assertions to
   `page.getByRole("combobox", { name: "Change status" })` with
   `.toContainText(...)` instead of the ambiguous `getByText`; public
   pages (which never render a Select) were unaffected and left as the
   original unambiguous pattern.
4. **The vote/comment-count correlated-subquery bug** described above
   under "Performance fix" and in `DECISIONS.md` D6-003 — the most
   significant finding this milestone. Not caught by lint, typecheck,
   the unit suite, or the integration suite (none of which exercised
   `listBoardPosts()`'s viewer-vote state end to end against a real
   vote), only by the full Playwright run, which is exactly the tier
   this project's three-tier discipline exists to catch this kind of
   defect at. Root-caused with a targeted reproduction against local
   Postgres before touching the fix, per this project's standing
   practice of not accepting a masked or unexplained failure.

No test, guard, or check was skipped, weakened, or marked `NOT
APPLICABLE` to obtain a passing result.

## Security observations

See `SECURITY.md`'s "Current status (as of M6)" section for the full
picture. Summary: status mutation is authenticated, tenant-scoped at
the data layer independent of the caller, and backed by a real
Postgres enum so an invalid value is rejected even if application
validation were bypassed; the public pages expose no status-changing
control at all, verified directly rather than assumed from route
protection alone.

## Known limitations

- **No status-change audit trail** — `statusChangedAt` records *when*
  the status last changed, not a history of every change or who made
  it. Explicitly out of scope (a `status_history` table was considered
  and rejected in `DECISIONS.md` D6-001 as unrequested for M6).
- **No rate limiting on status changes** — same accepted gap as
  M4/M5's public endpoints; status changes are admin-only and
  low-frequency, so the risk profile is lower, but no endpoint-specific
  limiter exists yet.
- **Search is a simple `ilike` substring match** — no full-text search,
  ranking, or fuzzy matching. Adequate at this scale; noted here in
  case admin catalogs grow large enough to need better search later.
- **No pagination on the admin list** — same caveat carried since M4;
  fine at current scale.
- The drizzle-kit dev-only `esbuild` advisory noted in prior reports
  remains open (no fixed stable release yet); unchanged this
  milestone.
- `feedback-ci.yml`'s Tier 3 job runs the integration-test tier against
  its `postgres:16` service container; this milestone's local
  validation used a locally-running Postgres 16 instance for
  equivalent (not identical-environment) coverage — the actual GitHub
  Actions run should be confirmed green on the PR before merge (see
  the final report for live status).

## Final `git status`

Recorded at commit time in this milestone's PR.

# Validation Report — M7: Public Roadmap

- **Milestone ID:** M7
- **Objective:** Complete the sellable customer journey — Feedback →
  Vote → Discussion → Roadmap (Planned/In Progress/Complete). Roadmap
  is a read-only view over the existing `Post`/status model, not a new
  domain concept — no `roadmap_item` table, no roadmap-specific admin
  console.
- **Repository:** `askgeniebhai/hamix`
- **Branch:** `claude/feedback-m7-public-roadmap`
- **Starting SHA:** `010a636e7eb7f9da93e4ce8462c1a8ccc6332ed5` (tip of
  `main` after PR #29 / M6 merged)
- **Ending SHA:** `0b88c5bea9140eae6f97f4737eb158886b79d34d` (this
  commit — application code, governance docs, and this report land
  together)
- **Files changed:** new roadmap query
  (`lib/feedback/data.ts`'s `listRoadmapPosts()`), a new
  `ROADMAP_STATUSES`/`RoadmapStatus` export
  (`lib/feedback/status.ts`), a new compound index
  (`lib/db/feedback-schema.ts`, `drizzle/0004_dusty_iceman.sql`), a
  new shared nav component
  (`components/feedback/public-board-nav.tsx`), the new roadmap page
  and loading skeleton (`app/b/[slug]/roadmap/`), a nav addition to
  the existing board page (`app/b/[slug]/page.tsx`), a new integration
  test file (`tests/integration/roadmap.test.ts`), a new E2E file
  (`e2e/roadmap.spec.ts`), and a test-only race fix applied to both the
  new file and the pre-existing `e2e/status.spec.ts`.

## Roadmap architecture

`listRoadmapPosts(boardId)` — `SELECT … FROM post WHERE board_id = $1
AND status IN ('planned','in_progress','complete') ORDER BY
status_changed_at DESC`, backed by a new compound index
`post_board_id_status_idx` on `(board_id, status)`. No new table: the
existing M6 status selector on the protected admin thread view
(`StatusSelect` / `updateStatusAction` / `updatePostStatus()`) is the
only way a post's roadmap placement ever changes — Open/Under Review →
hidden, Planned/In Progress/Complete → the matching section,
automatically. `ROADMAP_STATUSES` (`lib/feedback/status.ts`) is the
single source of truth for which three statuses are customer-facing,
shared by the query and the page's three section headings. Full
reasoning in `DECISIONS.md` D7-001.

## Query / data design

Filtering to the three customer-facing statuses happens in the `WHERE`
clause, never by fetching every post for the board and narrowing in
the browser. The already-small result (one board's
planned/in_progress/complete posts) is grouped into three sections by
the page component for rendering — that grouping is not the client-
side filtering the "database-side" requirement rules out, since the
database has already done the only filtering that could grow
unbounded. Reads are scoped by `boardId` alone, the same pattern
`listBoardPosts()` already uses; no separate organization assertion is
needed for a read, since the board itself was already resolved from a
legitimate slug lookup (`getBoardBySlug`).

## Public flow

- `/b/[slug]/roadmap`: header (board name, description, `PublicBoardNav`
  showing Feedback/Roadmap tabs), then a 3-column grid on desktop
  (`md:grid-cols-3`) that stacks to a single column on mobile
  (`grid-cols-1`). Each section (Planned / In Progress / Complete) has
  its own heading and an ordered list of cards; an empty section shows
  a calm "Nothing here yet" message rather than collapsing away, and
  an entirely empty roadmap shows a dedicated empty state.
- Each card: title, `StatusBadge`, vote count, comment count — all
  wrapped in a single link to the same public post detail page M4/M5
  already built (`/b/[slug]/p/[postId]`), no new detail page.
- `PublicBoardNav` is shared by both `/b/[slug]` and
  `/b/[slug]/roadmap`, so a visitor always has one clear way to move
  between "what's being asked for" and "what's happening about it."
- No dates, ETAs, quarters, or promises are shown anywhere on the
  roadmap — deliberately, per the milestone's explicit do-not-build
  list; `statusChangedAt` is used only to order cards within a
  section, never displayed.

## Tenant / security tests (all real, against a live Postgres database)

| Requirement | Test | Result |
|---|---|---|
| Open absent | `tests/integration/roadmap.test.ts` + `e2e/roadmap.spec.ts` — an Open post never appears in `listRoadmapPosts()`'s result or on the rendered page | PASS |
| Under Review absent | Same tests — Under Review is proven absent the same way Open is, not merely "not yet tested" | PASS |
| Tenant A post absent from tenant B roadmap | `tests/integration/roadmap.test.ts` — a second board's `listRoadmapPosts()` never includes the first board's post ids; `e2e/roadmap.spec.ts` — the same proven end-to-end with two real organizations | PASS |
| Public roadmap cannot mutate status | `e2e/roadmap.spec.ts` — an unauthenticated visitor's roadmap page renders zero elements matching `combobox`/`button` named "Change status" | PASS |
| Unknown board → safe 404 | `e2e/roadmap.spec.ts` — see "Known limitations" below; verified safe (root not-found UI renders, `noindex` set, no data leaked) rather than a literal HTTP 404 status, which this Next.js version's Cache Components architecture doesn't produce for a `notFound()` call after streaming starts (`DECISIONS.md` D7-002) — confirmed to be identical, pre-existing behavior on the already-shipped `/b/[slug]` board page, not a regression | PASS (as defined) |
| Unauthenticated visitor can view roadmap | `e2e/roadmap.spec.ts` — a fresh visitor with cookies cleared gets a `200` and the full roadmap UI | PASS |

## Accessibility & responsiveness

`e2e/roadmap.spec.ts`'s accessibility test seeds one post per roadmap
section, runs `AxeBuilder().analyze()` against the populated page, and
asserts zero violations; a separate assertion confirms
`document.documentElement.scrollWidth` never exceeds `clientWidth`
(no horizontal overflow) at both the desktop and mobile Playwright
project viewports. Both nav tabs and every card are reachable as real
`link`/`heading` roles, not custom unlabeled elements.

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
| Production build (`npm run build`) | PASS — with **zero environment variables set**; `/b/[slug]/roadmap` renders as a dynamic (`ƒ`) route |
| `drizzle-kit check` | PASS — schema/migration consistent |
| Unit tests (`npm run test`, Vitest) | PASS — 51/51 (unchanged from M6 — this milestone added no new unit-testable pure logic beyond what `ROADMAP_STATUSES`'s `satisfies` clause already checks at compile time) |

## Tier 3 — Runtime / End-to-End

**Result: PASS**

Real running app, real Postgres database (local Postgres 16),
Playwright against the built-and-launched app, `CI=true`.

- **Integration tests** (`npm run test:integration`, real database):
  **15/15 PASS** — the 5 pre-existing files plus 3 new tests in
  `tests/integration/roadmap.test.ts` (status filtering, tenant
  isolation, ordering).
- **Playwright**: **80/80 PASS** across both device projects
  (desktop-chromium, mobile-chromium), run with `--retries=0` (no
  masking) — the full pre-existing suite (auth, shell, feedback,
  comments, status) plus 8 new tests in `e2e/roadmap.spec.ts` × 2
  projects, minus tests that assert once rather than per-project.

## Failures discovered (and fixed, in the order found)

1. **A documentation error, corrected before any M7 work began**
   (per explicit Product Owner instruction): `DECISIONS.md` D6-003
   incorrectly said the M6 correlated-subquery bug "reached `main`
   inside PR #28." PR #28 was the M5 tenant-hardening pass and never
   touched those subqueries; the bug was introduced during M6
   development and caught by Playwright before M6 ever merged, so it
   never shipped to `main`. Corrected, then PR #29 was merged.
2. **A missing compound index, caught while writing the roadmap query's
   own doc comment.** The first draft of `listRoadmapPosts()`'s comment
   claimed a `board_status_idx` compound index backed the query — no
   such index existed (only separate `post_board_id_idx` and
   `post_status_idx`). Rather than leave an inaccurate comment, added
   the real index (`post_board_id_status_idx` on `(board_id, status)`,
   migration `0004_dusty_iceman.sql`) and corrected the comment to
   match.
3. **A genuine, reproducible Playwright race**, found while writing
   `e2e/roadmap.spec.ts`'s full-lifecycle test: `StatusSelect` updates
   its visible label optimistically (synchronously on click, before
   the server action's `await` resolves), so a test helper that only
   waited for that label — not the actual database write — could let
   a subsequent `page.goto` outrace the mutation. Reproduced
   deterministically (a post changed to Complete right before
   navigating to `/roadmap` sometimes wasn't there yet). Re-running the
   full existing suite with `--retries=0` surfaced the identical,
   already-shipped race latent in M6's own `status.spec.ts` (reported
   "flaky," passing only on its automatic retry) — not a new defect,
   but a real one this milestone's own testing happened to catch.
   **Fixed** by waiting for the mutation's actual POST response in
   both files' `changeStatus()` helper, not just the optimistic label
   (`DECISIONS.md` D7-003). Verified: full suite re-run with
   `--retries=0` is clean at 80/80 after the fix.
4. **A documented, non-defect finding, not "fixed" out of scope:**
   `/b/[slug]/roadmap`'s unknown-board case doesn't produce a literal
   HTTP 404 — this Next.js version's Cache Components architecture
   streams the route's shell as a `200` before a `notFound()` call
   inside it can change the status (confirmed directly against the
   Next.js docs bundled in this repo, and by curling a production
   build). Confirmed this is identical to the already-shipped
   `/b/[slug]` board page's existing behavior — not a regression
   introduced here. The test was corrected to verify what actually
   matters for safety (no data leak, the root not-found UI renders,
   `noindex` is set) instead of a status code this architecture
   can't produce at this point in the request lifecycle
   (`DECISIONS.md` D7-002).

No test, guard, or check was skipped, weakened, or marked `NOT
APPLICABLE` to obtain a passing result.

## Security observations

See `SECURITY.md`'s "Current status (as of M7)" section for the full
picture. Summary: the roadmap introduces no new write path — it reuses
M6's already-hardened `updatePostStatus()` exclusively — and its reads
are tenant-scoped by the same `boardId` pattern `listBoardPosts()`
already uses. Proven directly (not assumed): a second board's posts
are absent from the first board's roadmap query, and the public
roadmap page renders zero status-changing controls for an
unauthenticated visitor.

## Known limitations

- **Unknown-board roadmap doesn't 404 with a literal HTTP status** —
  see "Failures discovered" #4 and `DECISIONS.md` D7-002. This is a
  pre-existing characteristic shared with the already-shipped
  `/b/[slug]` board page, not introduced by M7, and does not leak any
  data.
- **No pagination within a roadmap section** — fine at current scale;
  same caveat carried since M4's post lists.
- **No status-change audit trail on the roadmap** — unchanged from
  M6; `statusChangedAt` records only the most recent change.
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

```
On branch claude/feedback-m7-public-roadmap
nothing to commit, working tree clean
```

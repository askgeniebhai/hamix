# Decision Log

Architecture and process decisions for this project, in chronological
order. Each entry is short: what was decided, why, and what was
rejected. This is a log, not a design document — see `ARCHITECTURE.md`
for the current state.

---

## D6-003 — Correlated count/exists subqueries must be built with the query builder, not raw `sql` templates with interpolated `Column` objects

**Date:** 2026-08-30
**Decision:** `voteCountSubquery()`, `commentCountSubquery()`, and
`votedByViewerSubquery()` in `lib/feedback/data.ts` are now built as
`getDb().select(...).from(...).where(eq(innerTable.column,
post.id))`, wrapped in `sql` (for the two counts) or Drizzle's
`exists()` helper (for the vote check), instead of a `sql` template
literal with `${post.id}`/`${vote.postId}` interpolated directly.
**Why:** The original (D6-002) implementation wrote each subquery as a
raw `sql` tag, e.g. `` sql`(select count(*) from ${vote} where
${vote.postId} = ${post.id})` ``. Drizzle's `sql` template renders an
interpolated bare `Column` object as its *unqualified* identifier —
`${post.id}` became just `"id"`, with no `"post".` prefix. Nested
inside a subquery whose own `FROM` is `vote` (or `comment`) — both of
which also have their own `id` column — that unqualified `"id"`
resolved to the *inner* table's `id`, not the outer `post.id` it was
meant to correlate against. The generated SQL was literally `select
count(*) from "vote" where "post_id" = "id"` — comparing `vote.post_id`
to `vote.id`, which is never true for a real vote row, not `post.id`.
The subquery therefore silently always returned `0`/`false`: every
post looked like it had zero votes and had never been voted on by the
viewer, regardless of what was actually in the `vote` table. This bug
was introduced during M6 development, not PR #28 (which was the M5
tenant-hardening pass and never touched these subqueries) — it was
caught by a full Playwright run against the uncommitted M6 branch
before M6 ever merged, so it never reached `main`. Two pre-existing M4
tests (`e2e/feedback.spec.ts`) that vote and then assert the button
flips to "Remove your vote" started failing, which is what surfaced
it. The query builder's own `eq()`
qualifies both sides of a comparison with their actual table names
(`"vote"."post_id" = "post"."id"`) because it knows which table each
`Column` belongs to independent of surrounding raw SQL text, which is
what makes the correlation land on the right row.
**Verified:** Reproduced directly against local Postgres — inserted a
real vote row, confirmed it existed in the `vote` table, then showed
the old subquery form returning `voteCount: 0` /
`votedByViewer: false` for that exact row and the new form returning
the correct `1`/`true` for the same data, before applying the fix to
`lib/feedback/data.ts`. Full suite re-run clean afterward: 51/51 unit,
11/11 integration, 64/64 Playwright (`desktop-chromium` +
`mobile-chromium`, `CI=true`), including the previously-failing
`e2e/feedback.spec.ts` vote tests and the new `e2e/status.spec.ts`.
**Rejected:** Manually table-qualifying the raw `sql` template (e.g.
interpolating a literal `` sql.raw(`"post"."id"`) ``) — works, but
hardcodes the outer table's SQL identifier as a string with nothing
tying it back to the actual `post` table object, so a future rename or
an added join alias would silently reintroduce the same class of bug
with no type-level signal; building the subquery through the query
builder keeps the correlation expressed in terms of the real `Column`
objects, which is what this project already prefers elsewhere
(`eq()`/`and()` throughout `lib/feedback/data.ts`) over hand-written
SQL fragments.

## D6-002 — Post list/detail vote and comment counts use per-post scalar correlated subqueries, not `leftJoin` + `count(distinct)` + `groupBy`

**Date:** 2026-08-30
**Decision:** `listBoardPosts()`, `listOrganizationPostsForAdmin()`,
`getPostForBoard()`, and `getPostForOrganization()` compute
`voteCount`, `commentCount`, and (where relevant) `votedByViewer` via
small subquery helpers (`voteCountSubquery()`, `commentCountSubquery()`,
`votedByViewerSubquery()`) selected alongside each post row, rather
than `leftJoin`ing both `vote` and `comment` onto `post` and
`groupBy`-ing with `count(distinct …)`.
**Why:** Explicit Product Owner performance instruction for M6: a
`leftJoin` of two independent one-to-many relations onto the same row
multiplies it by both counts before `GROUP BY` collapses the result
back down (a post with 100 votes and 50 comments joins out to 5,000
intermediate rows), and `count(distinct …)` only fixes the resulting
number, not the work Postgres does to get there. A scalar subquery per
metric counts each relation independently against its own
`post_id`-indexed table (`vote_post_id_idx`, `comment_post_id_idx`),
with no cross-relation fan-out at all, and reads as two/three simple,
separately-understandable queries rather than one join whose row
multiplication has to be mentally unwound.
**Verified:** Same evidence as D6-003 (which fixed a correlation bug
introduced while first writing these subqueries) — 51/51 unit, 11/11
integration, 64/64 Playwright, including `e2e/status.spec.ts`'s
sort-by-votes/sort-by-comments test, which specifically proves the
counts used for `ORDER BY` are correct per post, not merely present.
**Rejected:** `leftJoin` + `count(distinct)` + `groupBy` (the
Cartesian-fan-out pattern explicitly ruled out); a materialized
`vote_count`/`comment_count` column on `post` updated by triggers or
application code on every vote/comment write (real-time accuracy risk
if a write path ever forgets to update it, and out of scope for a
single-board-per-org product at this stage — the read-time subquery
cost is small and stays correct by construction).

## D6-001 — Post status: a real Postgres enum, a separate `statusChangedAt`, updated by one atomic `CASE`-guarded `UPDATE`

**Date:** 2026-08-30
**Decision:** `post.status` is a Postgres `pgEnum`
(`open` / `under_review` / `planned` / `in_progress` / `complete`,
default `open`), backed by `lib/feedback/status.ts` as the single
source of truth for the value list, labels, and a Zod schema
(`postStatusSchema`) kept in sync with the enum by hand (Drizzle
requires the enum and the Zod schema to be declared separately — there
is no single definition both can derive from). `post.statusChangedAt`
is a second column, only touched by `updatePostStatus()`'s `UPDATE …
SET status = $1, status_changed_at = CASE WHEN status = $1 THEN
status_changed_at ELSE now() END`, a single atomic statement rather
than a read-then-write.
**Why:** A real enum (not a `text` column with app-level validation)
means an invalid status is rejected by Postgres itself even if
application validation is ever bypassed — proven directly by
`tests/integration/status-update.test.ts`'s test that writes an
invalid value straight through Drizzle, bypassing `PostStatus`'s type
via `as never`, and confirms Postgres still rejects it. The `CASE`-guarded
single `UPDATE` keeps `statusChangedAt` correct under concurrent
requests without a separate `SELECT` first (which would have a
race between the read and the write) and makes "changing" a post to
its current status a true no-op for that column, verified by the same
test file's no-op case.
**Why not build more:** Explicitly scoped to a flat, admin-settable
enum with no workflow engine, no per-status permissions, no automatic
transitions, and no public-facing status *change* — the public board
and detail pages display `status` but render no control, verified by
`e2e/status.spec.ts`'s "status security" test (an unauthenticated
visitor, cookies cleared, sees no `combobox` named "Change status" on
either page). This keeps the model simple today while giving a future
Roadmap milestone (not built now) a stable, indexed
(`post_status_idx`), DB-enforced value to group by without needing a
schema change.
**Rejected:** A `text` column with only Zod-level validation (no
database-level guarantee); a separate `status_history` table (real
audit trail, but unrequested for M6 and adds a write to every status
change for a feature nothing yet consumes); recomputing
`statusChangedAt` via a trigger (moves the logic out of the one place
—`lib/feedback/data.ts`— this project already treats as the real
tenant/business-rule boundary, for no behavioral difference at this
scale).

## D5-003 — Hardening pass: every domain write re-verifies every id it's handed, not just `postId`

**Date:** 2026-08-30
**Decision:** Following a Product Owner review of the M5 data layer,
`lib/feedback/data.ts` gained three more tenant-scope assertions
alongside the existing `assertPostInOrganization()`:
`assertBoardInOrganization()`, `assertParticipantInOrganization()`,
and `assertAuthorIsMember()` (checks the `member` table directly).
Every write that takes a `participantId`, `boardId`, or
`authorUserId` now re-verifies that id belongs to the claimed
`organizationId` before writing — `createPost()` checks both
`boardId` and `participantId`; `castVote()` and
`createExternalComment()` check `participantId` in addition to the
`postId` check they already had; `createInternalComment()` checks
`authorUserId` is currently a member of the organization, not just
that the post is. `removeVote()` needed no new check — its `DELETE`
already scopes by `organizationId` directly on the `vote` row, so a
cross-tenant combination matches zero rows structurally.
**Why:** The original M4/M5 checks only verified the `postId` half of
each write. That was sufficient against the negative tests written at
the time (a `postId` from another organization), but left a narrower
gap unverified: a `participantId` or `authorUserId` that belongs to a
*different* organization than the one the request otherwise claims —
e.g. `organizationId: A, postId: <A's post>, participantId: <B's
participant>`. Nothing in the M4/M5 code paths could actually produce
that combination (participant ids come from a cookie scoped per
organization; `authorUserId` comes from the caller's own verified
session), so this was defense-in-depth against a *future* bug or
caller, not a fix for a reachable exploit in the shipped product — but
the data layer, not any particular server action, is what this project
treats as the real tenant boundary (`docs/M1_ARCHITECTURE_DECISION.md`,
D3-005, D4-002's own reasoning), so it should not depend on every
future caller getting it right.
**Verified:** `tests/integration/tenant-hardening.test.ts` — four new
tests, one per write, each proving the exact wrong-organization
combination named above is rejected, plus a same-organization control
case proving the legitimate path still succeeds. The full existing
suite (Tier 1/2/3, including the two integration-test files predating
this change) remains green with no behavior change for any real
caller, since every existing code path already only ever passed
same-organization ids.
**Rejected:** Trusting the existing single `assertPostInOrganization()`
check as sufficient — it verifies the object being acted on, not the
actor doing the acting, which is a different (and for `castVote`/
`createExternalComment`/`createInternalComment`, the more
security-relevant) half of the tenant boundary; a single combined
"assert everything" function taking all possible ids — four small,
single-purpose functions read more clearly at each call site about
exactly what's being verified, and only the ids relevant to that
specific write are checked.

## D5-001 — Comment author exclusivity enforced by a database CHECK constraint

**Date:** 2026-08-30
**Decision:** `comment` has two nullable foreign keys —
`participant_id` (external customer reply) and `author_user_id`
(internal team reply) — with a Postgres `CHECK` constraint
(`comment_exactly_one_author_chk`) requiring exactly one to be set,
never both and never neither. `lib/feedback/data.ts`'s
`createExternalComment()`/`createInternalComment()` each only ever set
one of the two, but the constraint is what actually guarantees no
future code path (a bug, a new caller, a manual `INSERT`) can produce
an authorless or double-authored comment.
**Why:** M5's instruction is explicit — "Enforce exactly one valid
author type. No anonymous raw client-supplied author IDs." A single
`author_id` column with a separate `author_type` enum column would
express the same intent but relies entirely on application code to
keep the two columns consistent; two nullable FKs plus a CHECK
constraint lets the *type system* (a real foreign key to `participant`
or `user`, not a loosely-typed id + string tag) and the *database*
both enforce correctness, matching the project's existing preference
for structural guarantees over convention (the same reasoning behind
`vote_post_participant_uidx` in M4). Proven directly — not just
assumed from the schema — by
`tests/integration/comment-author-constraint.test.ts`, which attempts
both an invalid double-authored row and an invalid authorless row and
asserts Postgres rejects both.
**Rejected:** A single polymorphic `author_id` + `author_type`
column — weaker typing, no real FK integrity to either table, and
still needs a CHECK constraint to enforce "type must be 'participant'
or 'user'" so it wouldn't actually be simpler; a separate `comment`
subtype per author kind (e.g. `customer_comment`/`team_comment`
tables) — over-engineered for M5's single `body` field, and would
complicate `listCommentsForPost()`'s single ordered thread query for
no benefit yet.

## D5-002 — Comments reuse the M4 participant-identity cookie; team replies reuse `requireActiveOrganization()`

**Date:** 2026-08-30
**Decision:** External comment authorship uses exactly the same
identity mechanism as M4's voting (`lib/feedback/participant.ts`'s
per-organization cookie, identify-inline-if-needed) — no new identity
system for comments. Internal team replies require nothing beyond
`requireActiveOrganization()` (`lib/auth/session.ts`), the same
tenant-membership check every other protected admin page already
uses; `author_user_id` is always the verified session's own
`session.user.id`, never read from `formData`.
**Why:** M5 explicitly directs reusing M4's participant identity
("Returning participant → can comment without re-identifying") rather
than inventing a comment-specific identity flow, and reusing
`requireActiveOrganization()` for "who may post as this
organization's team" is the same reasoning as M3's tenant-isolation
pattern: never trust a client-supplied identity when a server-side
session/membership check already exists. This is also what makes
"non-member cannot use internal-author identity" and "raw author IDs
cannot be spoofed" (both M5-mandatory negative tests) true by
construction rather than by an extra check someone could forget to
add — a non-member's session simply resolves to a *different*
organization, so `getPostForOrganization()` returns `null` for any
post outside it and the reply form is never even reachable.
**Rejected:** A lighter-weight "just trust an `authorUserId` field in
the form" — the exact anti-pattern M3's D3-005 and M4's tenant checks
already exist to rule out; a separate comment-only auth check
duplicating `requireActiveOrganization()`'s logic — would drift from
the one real membership check over time instead of sharing it.

## D4-001 — One board per organization, created atomically via `afterCreateOrganization`

**Date:** 2026-08-29
**Decision:** Every organization gets exactly one `board` row, created
inside Better Auth's `organizationHooks.afterCreateOrganization` hook
(`lib/auth/index.ts`) — not from the workspace-creation UI form,
and not lazily on first portal visit. The board's `slug` is set equal
to the organization's own (already globally unique) slug, so the
public portal URL is simply `/b/[organization-slug]` with no separate
board slug for a user to name.
**Why:** M1_ARCHITECTURE_DECISION.md's domain shape allows an
organization to run more than one board in the future, so a real
`board` table (rather than treating `organization` itself as the
board) keeps that door open without a future schema change — while
M4's explicit "smallest complete workflow" scope only needs one.
Creating it in the hook (which fires for every path that creates an
organization — the onboarding form today, an API caller or admin
tool tomorrow) guarantees the invariant "every organization has a
board" holds everywhere, rather than only wherever a developer
remembered to also call a "create board" step. Reusing the
organization's slug removes an entire redundant input from the
workspace-creation form.
**Rejected:** A separate "board name/slug" field on workspace
creation — real product value (multiple named boards) that M4 doesn't
need yet, and would add a UI step and a slug-uniqueness edge case for
zero benefit at this milestone; lazily creating the board on first
portal visit — leaves a window where `getBoardForOrganization` in the
admin view legitimately returns null for a brand-new organization,
which the admin page already handles gracefully, but there's no
reason to accept that state when it's just as cheap to guarantee it
never happens.

## D4-002 — External participant identity: cookie-linked, not account-based

**Date:** 2026-08-29
**Decision:** A `participant` is identified by (organization, email),
upserted via `identifyParticipant()`, and linked to later requests by
an opaque `publicToken` in an HttpOnly, per-organization cookie
(`lib/feedback/participant.ts`) — never a client-supplied participant
id, and never Better Auth's own user/session system. Vote-uniqueness
is enforced by a real database unique index
(`vote_post_participant_uidx` on `(post_id, participant_id)`), proven
race-safe under genuine concurrency by a new integration-test tier
(`tests/integration/`, real Postgres, run in Tier 3 — see
`vitest.integration.config.ts`) rather than by a UI-level double-click
test, which can't reliably reproduce a true race.
**Why:** M4's explicit instruction is to keep internal
`user`/`member` and external feedback participants structurally
separate — a shared identity system would blur that line the first
time someone reused a workspace-member's email as a participant's.
Email is the minimum information that lets the same person vote once
and be recognized on return, satisfying "avoid unnecessary personal
information." The cookie only ever carries an opaque token (not the
email, not a raw database id), so a returning visitor is recognized
without re-typing their email, but the cookie's blast radius if
stolen is limited to acting as that one participant on that one
organization's board — nothing account-like.
**Rejected:** Reusing Better Auth's session system for participants —
would require every visitor to "sign up" to submit feedback, directly
against the milestone's own instruction and against normal Canny-style
UX; trusting a client-supplied participant/organization id on the vote
request — the exact class of bug D3-005 fixed in the auth session
module, not repeating it here; proving race-safety via a simulated
browser double-click — timing in a real browser/network is not a
reliable way to force two requests to race at the database, so the
new integration-test tier calls the actual data-access function twice
concurrently instead.

## D3-001 — Switch from `neon-http` to standard `node-postgres`

**Date:** 2026-08-29
**Decision:** `lib/db/index.ts` now uses `drizzle-orm/node-postgres` +
the `pg` package, dropping `@neondatabase/serverless`'s `neon-http`
driver picked in M1 (`docs/TECH_STACK.md`).
**Why:** Discovered while wiring real DB-backed testing for M3:
`neon-http`'s HTTP/WebSocket driver can only reach actual Neon/Vercel/
Supabase endpoints — attempting `drizzle-kit migrate` against local
Postgres hung indefinitely (confirmed via the driver's own console
warning: "can only connect to remote Neon/Vercel Postgres/Supabase
instances through a websocket"). That made it impossible to test real
auth/tenant flows locally or in CI. `node-postgres` connects over the
standard Postgres wire protocol, which Neon fully supports via the
same `DATABASE_URL` (`sslmode=require` enables TLS automatically) — so
one client now works unmodified against local Postgres, a CI
`postgres:` service container, and real Neon in production.
**Rejected:** Keeping `neon-http` and only testing against a real
provisioned Neon database — would require live Neon credentials in
every contributor's environment and in CI secrets for a foundation
milestone that shouldn't need real cloud infrastructure yet.

## D3-002 — Hand-patch `account.issuer`, missing from the CLI-generated schema

**Date:** 2026-08-29
**Decision:** Added an `issuer` column (+ a unique `(issuer, accountId)`
index) to the `account` table in `lib/db/auth-schema.ts`, on top of
what `@better-auth/cli generate` produced.
**Why:** `@better-auth/cli` resolved to version 1.4.21 (flagged
deprecated on npm) while our installed `better-auth` core is 1.7.2.
Signing up against the CLI's generated schema failed at runtime:
`"The field issuer does not exist in the account Drizzle schema"` —
better-auth core ≥1.7 scopes account identity by issuer
(better-auth.com/docs/guides/1-7-upgrade-guide), a schema change the
older CLI doesn't know about. The exact field (`type: string,
required: true`) and its unique index were taken from
`node_modules/@better-auth/core`'s own schema source — the ground
truth for the installed version — not guessed.
**Rejected:** Pinning to an older `better-auth` core matching the CLI —
would give up the current, actively-maintained version (and its
Vercel backing, per `docs/TECH_STACK.md`) to work around a stale
scaffolding tool; patching the one missing field is smaller and keeps
the dependency current.

## D3-003 — Carry the active workspace forward across a fresh login

**Date:** 2026-08-29
**Decision:** `requireActiveOrganization()` (`lib/auth/session.ts`), on
finding a session with no `activeOrganizationId`, now looks up the
user's most recent organization membership and, if one exists,
activates it via Better Auth's own `setActiveOrganization` server API
before proceeding — rather than immediately treating "no active org on
this session" as "no workspace."
**Why:** A fresh login creates a brand-new session row with
`activeOrganizationId: null`, even for a user who already owns a
workspace from a previous session — Better Auth doesn't carry it
forward automatically. Without this, the M3-required flow ("workspace
persists" across logout/login) sent returning users through
`/onboarding` again on every login, discovered by the M3 Playwright
lifecycle test.
**Rejected:** Handling this per call site (e.g. in the login form,
redirect based on `organization.list()`) — would need every future
entry point (login, direct navigation, a future "magic link", etc.) to
remember the same logic; putting it in the single tenant-resolution
function is the one place `docs/M1_ARCHITECTURE_DECISION.md`'s
data-access model already designates for this kind of decision.

## D3-004 — Disable Better Auth's rate limiter only when `CI=true`

**Date:** 2026-08-29
**Decision:** `lib/auth/index.ts` passes `rateLimit: { enabled: false }`
to `betterAuth()` only when `process.env.CI` is set; otherwise Better
Auth's own default applies (enabled only when `NODE_ENV=production`).
**Why:** Better Auth's default is "rate limiting on in production" —
and `next build && next start` (what both the E2E suite's Playwright
`webServer` and a real deployment run) is a production build either
way. The M3 Playwright suite's legitimate rapid-fire signups (multiple
tests, two device projects, several workers) tripped the limiter with
"Too many requests," failing tests that had nothing to do with abuse.
`CI=true` is set automatically by GitHub Actions and was exported by
hand for local validation runs; a real production deployment (no `CI`
env var) keeps Better Auth's default protection.
**Rejected:** Disabling rate limiting unconditionally — would remove a
real production protection `SECURITY.md` calls for ("rate limiting
where justified") for no reason beyond convenience; raising the
threshold instead of disabling — still needed a signal to distinguish
"CI's own test traffic" from a real production deployment, so it
doesn't remove the need for this same env check.

## D3-005 — Call `headers()` before `getAuth()` in every session lookup

**Date:** 2026-08-29
**Decision:** In `lib/auth/session.ts`, both `getSession()` and
`requireActiveOrganization()` now `await nextHeaders()` into a local
variable *before* calling `getAuth()`, instead of inlining
`getAuth().api.getSession({ headers: await nextHeaders() })`.
**Why:** CI's Tier 2 build (a clean checkout with zero environment
variables, per D2-001) failed prerendering `/onboarding`:
`getEnv()` threw `ZodError` for missing `DATABASE_URL`/
`BETTER_AUTH_SECRET`. Root cause was JS call-evaluation order, not a
missing env var — `getAuth()` (the left-hand callee of
`getAuth().api.getSession(...)`) evaluates before its argument
expression, so the lazy auth/env singleton was being constructed
*before* `next/headers`'s `headers()` was ever called. Next.js only
learns a route needs to be rendered dynamically (and so must skip
static generation) once a dynamic API like `headers()` is actually
invoked; with the old ordering, the build reached `getEnv()` first and
failed outright instead of correctly deferring the page to request
time. This had been masked locally because `.env.local` always
supplied real values, so `getEnv()` never threw during local builds.
**Verified:** `next build` passes with `.env.local` renamed away
(zero env vars, matching CI exactly) — `/onboarding`, `/dashboard`,
`/settings`, `/login`, `/signup` all render as dynamic (`ƒ`) routes,
none prerendered; full Playwright suite still 34/34 with `CI=true`.
**Rejected:** Adding `export const dynamic = "force-dynamic"` to each
affected page — treats the symptom per-route instead of the shared
root cause in `lib/auth/session.ts`, and a future page built on the
same helpers would silently reintroduce the bug; setting dummy
build-time env var defaults — would weaken `lib/env.ts`'s fail-closed
validation (D2-001) for no real benefit.

## D2-001 — Lazily construct env/db/auth so the build never requires live secrets

**Date:** 2026-08-29
**Decision:** `lib/env.ts`, `lib/db/index.ts`, and `lib/auth/index.ts`
each expose a memoized `get*()` function instead of a module-level
constant, and `app/api/auth/[...all]/route.ts` calls `getAuth()` inside
its `GET`/`POST` function bodies, not at module top level.
**Why:** A first attempt (`export const { GET, POST } =
toNextJsHandler(getAuth())` at module top level) failed `next build`
with a `ZodError` for missing `DATABASE_URL`/`BETTER_AUTH_SECRET` —
Next.js executes a route module's top-level code during build-time
"Collecting page data", not only at request time. Deferring the call
into the exported functions fixed it: confirmed with a clean `next
build` and no environment variables set, and the route only touches
env/db/auth when an actual request to `/api/auth/*` arrives.
**Rejected:** Requiring `DATABASE_URL`/`BETTER_AUTH_SECRET` in CI/build
just to satisfy this — would contradict M2's "foundation only, no live
database" scope for no real benefit, since nothing in M2 reads from the
database yet.

## D2-002 — shadcn/ui Base UI + Nova preset, with token fixes

**Date:** 2026-08-29
**Decision:** Initialized shadcn/ui with the Base UI primitive library
and the "Nova" preset (Lucide icons, Geist font), then made two
deliberate token edits: (1) added a restrained indigo accent
(`oklch(0.32 0.09 264)` light / `oklch(0.75 0.1 264)` dark) for
`--primary`/`--ring` instead of shipping pure grayscale, and (2)
darkened `--muted-foreground` from `oklch(0.556 0 0)` to
`oklch(0.47 0 0)` after an automated accessibility scan (axe, via
Playwright) found the shipped default failed WCAG AA contrast
(4.34:1, needs 4.5:1) against `--muted`.
**Why:** Base UI is shadcn/ui's current recommended default (per
`docs/TECH_STACK.md`'s research); Nova's neutral palette matches
`docs/DESIGN_PRINCIPLES.md`'s "calm visual language," but needed one
original accent to avoid reading as generic, and the contrast fix is a
direct instance of `docs/DESIGN_PRINCIPLES.md`'s "accessibility is
part of premium design" being enforced by evidence, not assumption.
**Rejected:** Leaving the default token contrast as shipped — would
have been "ship now, fix if someone notices," which
`PROJECT_CONSTITUTION.md` Rule 9 (Evidence-Based Completion) doesn't
allow once the evidence (a failing automated check) exists.

## D2-003 — Route-group split: public shell vs. authenticated workspace

**Date:** 2026-08-29
**Decision:** `app/page.tsx` is the public entry shell; `app/(workspace)/`
is a route group holding the authenticated-app layout (sidebar +
topbar) and its pages (currently just `dashboard/`). Neither route is
actually access-controlled yet — Better Auth isn't wired into any page
in M2.
**Why:** Matches `docs/M1_ARCHITECTURE_DECISION.md`'s application
layout, and gives the two UI contexts described by the M2 task
("public entry shell" and "authenticated-app layout foundation")
distinct, real routes to render — rather than one undifferentiated
page — without requiring the auth wiring that's explicitly out of
scope for M2.
**Rejected:** Gating `/dashboard` behind a real auth check now — would
require building the account/session UI M2 explicitly excludes; the
route exists as a foundation to gate in a future milestone.

## D2-004 — Record proactive-acquisition, evidence-driven product direction

**Date:** 2026-08-29
**Decision:** Added
[`docs/PRODUCT_DIRECTION.md`](./docs/PRODUCT_DIRECTION.md): the
business is acquired both self-serve and via proactive outreach (the
company approaching suitable businesses to offer feedback capture),
and any future demand-intelligence feature must be grounded in real
customer feedback signal — categorization, deduplication, sentiment,
recurring-demand detection — never in scanning a prospect's site or
product and asserting the company's own opinion of what's wrong.
Cross-referenced from `README.md`, `PROJECT_CONSTITUTION.md` Rule 1,
and `MILESTONES.md`.
**Why:** Explicit, permanent Product Owner instruction. Recording it
now, as documentation, means future milestones (including the
proactive-acquisition and demand-intelligence features themselves,
whenever authorized) inherit the constraint instead of it being
re-explained or drifting.
**Scope note:** Documentation only. No categorization, deduplication,
sentiment-analysis, demand-detection, or recommendation-generation
feature was implemented or authorized by this entry. Canny-style
capture/organize/roadmap/changelog remains the first product
foundation per `MILESTONES.md`.

## D1-001 — Next.js + PostgreSQL(Neon) + Drizzle as the core stack

**Date:** 2026-08-29
**Decision:** Next.js (App Router, TypeScript), one deployable unit,
backed by PostgreSQL hosted on Neon, accessed via Drizzle ORM.
**Why:** Matches `ARCHITECTURE.md`'s "one deployable unit, simplest
architecture" principle; Postgres fits this product's inherently
relational data (tenants, posts, votes); Drizzle's SQL-visible queries
make tenant-scoping auditable, directly serving the tenant-isolation
requirement in `SECURITY.md`. Full comparison in `docs/TECH_STACK.md`.
**Rejected:** Separate SPA + API backend (unneeded second deployable);
Prisma (less query transparency for tenant-scoping, though a close
call after Prisma 7's performance rewrite); MongoDB (fights this
product's relational shape); self-managed Postgres (more ops burden
than warranted yet).

## D1-002 — Better Auth for authentication and multi-tenancy

**Date:** 2026-08-29
**Decision:** Better Auth, using its `organization()` plugin as the
workspace/tenant/membership/RBAC model.
**Why:** Ships a documented, typed organizations model — this
product's core "workspace" concept — instead of requiring that schema
and access-control layer to be hand-built (Rule 11, reuse before
rewrite). MIT-licensed, no per-user fee, and acquired by Vercel in
early 2026 as the maintained successor to Auth.js, pairing naturally
with the Next.js/Vercel choice above. Full comparison in
`docs/TECH_STACK.md`.
**Rejected:** Auth.js/NextAuth (no built-in tenant/org model — would
mean building exactly the plumbing Better Auth already provides);
Clerk (per-MAU pricing works against a free-entry, expansion-driven
business model before revenue exists); Supabase Auth (would only make
sense paired with Supabase as the database, which was not selected).

## D1-003 — Tailwind + shadcn/ui (owned components) for the design system

**Date:** 2026-08-29
**Decision:** Tailwind CSS for styling tokens; shadcn/ui-generated
components (Radix/Base UI primitives, copied into the repo) as the
base component set, restyled to the premium standard in
`docs/DESIGN_PRINCIPLES.md`.
**Why:** Components live in our own codebase so they can be fully
restyled to a distinct, premium visual identity while inheriting
accessible primitives (keyboard nav, focus management, ARIA) rather
than rebuilding them. Directly serves Constitution Rule 12 (Premium
Design Standard) and Rule 11 (reuse before rewrite) simultaneously.
Full comparison in `docs/TECH_STACK.md`.
**Rejected:** MUI/Ant Design/Chakra (opinionated look that reads as a
generic admin dashboard — the anti-pattern `DESIGN_PRINCIPLES.md`
explicitly warns against); a fully custom component library
(reinvents solved accessibility work).

## D0-001 — Host this project inside the HAMIX repository, isolated under `feedback/`

**Date:** 2026-08-29
**Decision:** Build this project as a top-level `feedback/` directory
inside the existing HAMIX Git repository, with a hard boundary at
`feedback/**` (plus its own CI workflow file), rather than a separate
repository.
**Why:** Explicit instruction for this phase — the HAMIX repository is
being used only as available Git hosting. No HAMIX code, data, or
infrastructure is shared.
**Rejected:** A new dedicated repository (deferred, not rejected
outright — may still happen later; not needed for M0).

## D0-002 — RepoGuard implemented as a dependency-free Node.js script

**Date:** 2026-08-29
**Decision:** `feedback/scripts/repo-guard.js`, plain Node.js (uses only
built-in modules), no npm dependencies, no `package.json` required to
run it.
**Why:** Node.js is already the stack used elsewhere in this repository
(`website/`, `platform/backend/`), so it is available in CI without new
tooling. A dependency-free script avoids install-time failures and
supply-chain risk for a tool whose entire job is to *gate* trust.
**Rejected:** A shell script (less portable/testable), a Python script
(would add an unused second language to a Node-based CI pipeline for no
benefit at this stage).

## D0-003 — No product technology stack selected in M0

**Date:** 2026-08-29
**Decision:** M0 makes no framework, database, hosting, or
authentication choice. `ARCHITECTURE.md` documents principles only.
**Why:** Constitution Rule 4 (small, controlled milestones) and explicit
instruction — M0 is governance and tooling only.
**Rejected:** Pre-selecting a stack "to save time later" — explicitly
against the milestone scope.

## D0-005 — Adopt permanent reuse-first and premium-design directives

**Date:** 2026-08-29
**Decision:** Record two Product Owner directives as permanent
Constitution rules (11 and 12) with supporting detail documents:
[`docs/ENGINEERING_PRINCIPLES.md`](./docs/ENGINEERING_PRINCIPLES.md)
(prefer mature public/open-source resources over custom code;
discover → inspect → reuse → configure → integrate; dependency and
license discipline) and
[`docs/DESIGN_PRINCIPLES.md`](./docs/DESIGN_PRINCIPLES.md) (a premium,
Apple-inspired UI/UX standard — philosophy and polish, never Apple's or
Canny's exact UI/assets/branding — plus a design-system requirement and
a Tier 3 UI-validation extension).
**Why:** Explicit, permanent Product Owner instruction, applying to all
`feedback/**` work beginning with the next approved milestone.
**Scope note:** This is documentation only — no product implementation,
technology-stack selection, or UI work was started to produce it. It
was added to the still-open M0 pull request as a follow-up commit
rather than a new PR, since it is governance material of the same kind
as the rest of M0's foundation and the branch had not yet merged.

## D0-004 — Three-tier validation gets a bootstrap interpretation for M0

**Date:** 2026-08-29
**Decision:** Since no application runtime exists yet, Tier 2 and Tier 3
for M0 validate the governance/tooling pipeline itself (clean-checkout
reproduction, RepoGuard correctness, CI validity, boundary enforcement)
rather than real product behavior.
**Why:** The three-tier framework is required from milestone one, but
Tier 3 in particular is meaningless without a runtime to exercise.
**Constraint:** `VALIDATION.md` explicitly states this bootstrap
interpretation must not be reused once a real runtime exists.

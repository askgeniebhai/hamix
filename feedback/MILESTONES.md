# Milestones

Only one milestone is authorized and in progress at a time (Constitution
Rule 4). Do not start the next milestone without explicit Product Owner
authorization, even if it seems obvious.

## M0 — Foundation & Governance

**Status:** Complete. Merged to `main` via PR #22. See
`validation/reports/M0-validation-report.md`.

**Scope:**

- `feedback/` top-level project directory
- Governance documents: `README.md`, `PROJECT_CONSTITUTION.md`,
  `ARCHITECTURE.md`, `MILESTONES.md`, `VALIDATION.md`, `SECURITY.md`,
  `DECISIONS.md`
- RepoGuard (`feedback/scripts/repo-guard.js`)
- Three-tier validation framework (`VALIDATION.md`) and its bootstrap
  interpretation for a project with no application runtime yet
- Project-specific CI (`.github/workflows/feedback-ci.yml`)
- A validation report for this milestone

**Explicitly out of scope for M0:** any product feature (feedback
boards, voting, roadmap, changelog, accounts, billing, AI, integrations,
CRM-style views, landing page) and any technology stack selection.

## M1 — Architecture & Tech Stack Selection

**Status:** Complete. Merged to `main` via PR #23. See
`validation/reports/M1-validation-report.md`.

**Scope:** Research and decide the technology stack and high-level
architecture only. No product code, no schema, no dependency
installed.

- [`docs/TECH_STACK.md`](./docs/TECH_STACK.md) — one recommended
  choice per category (framework, database, ORM, auth, UI, validation,
  testing, billing, email, hosting, observability), each with
  why / alternatives rejected / cost / license / risk.
- [`docs/M1_ARCHITECTURE_DECISION.md`](./docs/M1_ARCHITECTURE_DECISION.md)
  — how that stack fits together: multi-tenancy model, conceptual
  domain shape, application layout, deployment topology.
- Decision log entries `DECISIONS.md` D1-001–D1-003.

**Explicitly out of scope for M1:** any product feature, any schema or
migration, any dependency installation, any UI implementation, any
"minimal skeleton" app. Research and decision only.

## M2 — Running Application Foundation

**Status:** Complete. Merged to `main` via PR #24. See
`validation/reports/M2-validation-report.md`.

**Scope:** Implement the M1 stack as a real, running application shell.
No product features.

- Next.js (App Router, TypeScript) + Tailwind + shadcn/ui, with an
  original, premium-calm design token system
- Public entry shell (`app/page.tsx`) and an authenticated-app layout
  foundation (`app/(workspace)/`: sidebar + topbar), with reusable
  loading/error/empty-state primitives
- Drizzle ORM + Neon connection foundation, intentionally empty schema
- Better Auth foundation (`organization()` plugin configured, no
  account UI wired in)
- Zod-validated environment config, `.env.example`, `/api/health`
- Vitest unit tests and a Playwright E2E suite (load, navigation,
  responsive smoke, zero overflow, automated accessibility scans)
  exercised against the real built-and-launched app
- `feedback-ci.yml` extended with real lint/typecheck/build/test/e2e
- Decision log entries `DECISIONS.md` D2-001–D2-003

**Explicitly out of scope for M2:** feedback boards, voting, comments,
roadmap, changelog, billing, AI, CRM integrations, and any full
database schema or account workflow.

## M3 — Workspace & Authentication Foundation

**Status:** Complete. Merged to `main` via PR #25. See
`validation/reports/M3-validation-report.md`.

**Scope:** Real authentication, session handling, workspace/organization
creation and membership, protected routes, and a tenant-aware
data-access foundation, using the M1-selected stack. No product
features.

- Signup, login/logout, secure cookie-based sessions (Better Auth)
- Workspace/organization creation (`/onboarding`) and membership,
  built on Better Auth's `organization()` plugin
- Current-workspace selection and switching (multi-organization
  aware), with a fresh-login carry-forward fix so the active workspace
  persists across logout/login
- Protected workspace routes: `proxy.ts` (Next 16's renamed
  `middleware.ts`) for a fast cookie-presence redirect, backed by the
  real server-side check in `lib/auth/session.ts`
- Tenant-aware data-access foundation: `requireActiveOrganization()`
  re-verifies the session's active organization against the `member`
  table rather than trusting the session cookie alone — the single
  place every future tenant-scoped query goes through
- Basic user profile (`/settings`): name, email, workspace, role
- Schema/migrations for users/auth, organizations/workspaces, and
  membership only — generated via the official Better Auth CLI, no
  domain tables
- Playwright coverage of the full lifecycle (signup → workspace →
  logout → protected-route rejection → login → workspace persists),
  unauthenticated rejection, invalid login, session persistence,
  signup validation, secret non-exposure, and a genuine cross-tenant
  negative test against a real Postgres database
- Decision log entries `DECISIONS.md` D3-001–D3-005

**Explicitly out of scope for M3:** feedback posts, voting, comments,
roadmap, changelog, billing, AI/intelligence, CRM/integrations, and
any invite-teammate / multi-user-per-organization UI beyond the
creator's own membership.

## M4 — Feedback Submission & Voting

**Status:** Complete. Merged to `main` via PR #26. See
`validation/reports/M4-validation-report.md`.

**Scope:** The smallest complete Canny-style public workflow: a public
feedback portal, submission, voting/unvoting, and a minimal admin
view — the first real product feature, on top of M3's tenant-scoped
foundation. `Feedback`/`Post` and `Comment` remain distinct entities;
no comment table or UI is introduced here.

- Domain schema: `board`, `post`, `vote`, `participant` (the external
  feedback participant/customer identity — deliberately distinct from
  the internal `user`/`member` Better Auth model), every row carrying
  its own `organization_id`
- Exactly one board is created atomically with every organization, via
  Better Auth's `organizationHooks.afterCreateOrganization` hook —
  the public URL is `/b/[organization-slug]`, the simplest
  well-justified equivalent to a separate board slug for this
  milestone
- Public portal (`/b/[slug]`): feedback list with vote counts,
  submit-feedback form (title, description, name, email — the
  minimum needed to attribute a submission/vote safely), vote/unvote
  control, empty/loading/error states, responsive, accessible
- Participant identity (`lib/feedback/participant.ts`): an
  HttpOnly, per-organization cookie carrying an opaque token, so a
  returning visitor doesn't re-enter their email; created via the
  submit-feedback form, or inline the first time an unidentified
  visitor votes
- Voting: one vote per (post, participant), enforced by a database
  unique index (`vote_post_participant_uidx`) — not just application
  logic — verified race-safe under real concurrent requests
  (`tests/integration/vote-race.test.ts`, a new integration-test tier
  with a real database, run in Tier 3)
- Tenant-scoped data access (`lib/feedback/data.ts`): every read/write
  either takes an already-resolved `organizationId` or is the one
  place that resolves it (the public board-by-slug lookup); a post's
  organization is re-verified before a vote is recorded, so a
  cross-tenant `postId` can never be voted on
- Minimal admin view (`/feedback`, protected): real submitted posts,
  vote counts, and submitter identity, for the active organization's
  board only
- Playwright coverage of the full public flow (submit → vote → persist
  on reload → unvote → admin sees it), the inline-identify voting
  path, invalid-submission rejection (server-side, bypassing client
  validation), unauthenticated admin-route rejection, and a genuine
  cross-tenant negative test (a second organization's board/admin view
  never shows the first organization's post)
- Decision log entries `DECISIONS.md` D4-001–D4-002

**Explicitly out of scope for M4:** comments, semantic deduplication,
AI/prioritization, roadmap, changelog, billing, CRM, revenue
weighting, moderation, and post categories/tags.

## M5 — Feedback Detail & Comments

**Status:** Complete. Merged to `main` via PR #27. See
`validation/reports/M5-validation-report.md` (including its
post-merge hardening addendum — `DECISIONS.md` D5-003, merged
separately via PR #28 since PR #27 had already merged before the
Product Owner's hardening instruction arrived).

**Scope:** The basic Canny-style discussion loop — a public feedback
detail/thread page, a distinct Comment entity (separate from Post),
external customer replies, and public replies from authenticated
workspace members, clearly distinguished visually. No private/internal
notes, no moderation.

- Public feedback detail page (`/b/[slug]/p/[postId]`): title,
  description, vote control/count, submitter, created date, comment
  thread, add-comment form
- `comment` domain table: `organization_id`, `post_id`, exactly one of
  `participant_id` (external reply) or `author_user_id` (internal team
  reply) — enforced by a database CHECK constraint, not just
  application logic (`DECISIONS.md` D5-001)
- External comments reuse M4's participant identity: a returning
  participant (cookie already set) comments without re-identifying; a
  new one identifies inline first, the same pattern as M4's vote
  control
- Internal team replies: any authenticated workspace member can post a
  public reply from the protected admin thread view
  (`/feedback/[postId]`), visually distinguished with a "Team" badge
  and a tinted card — `requireActiveOrganization()` is the entire
  membership check, so a non-member can never post as another
  organization's team
- Admin: `/feedback/[postId]` shows the full thread (comments +
  submitter/vote detail) with a public-reply form; the `/feedback` and
  `/b/[slug]` lists now link to detail pages and show comment counts
- Tenant-scoped data access (`lib/feedback/data.ts`): every comment
  write re-verifies the post belongs to the caller's organization
  before writing, the same `assertPostInOrganization` check voting
  already used, shared to avoid duplicating the tenant boundary logic
- A new database-backed integration test proves the author-exclusivity
  CHECK constraint at the Postgres layer, not just in application code
  (`tests/integration/comment-author-constraint.test.ts`)
- Playwright coverage of the full thread flow (submit → open → comment
  → persist on reload → internal reply → public visitor sees both →
  admin sees the thread), inline-identify commenting, server-side
  rejection of invalid/empty/oversized comments, unauthenticated and
  cross-organization admin-thread access rejection, and cross-tenant
  comment/post invisibility
- Decision log entries `DECISIONS.md` D5-001–D5-002

**Explicitly out of scope for M5:** statuses, tags/categories,
duplicate merging, roadmap, changelog, notifications, AI, semantic
dedup, billing, CRM, private/internal notes, and any comment
editing/deleting/moderation system.

## M6 — Feedback Status & Admin Management

**Status:** Complete. Merged to `main` via PR #29 (SHA
`010a636e7eb7f9da93e4ce8462c1a8ccc6332ed5`). See
`validation/reports/M6-validation-report.md`. Automated code review on
the PR found three small, real bugs, all fixed before merge: repeated
`searchParams` values (`?q=a&q=b`) weren't normalized before use, the
admin filters' navigation could revert a select change under a
debounce race, and the search box's ILIKE pattern didn't escape
`%`/`_` wildcard characters.

**Scope:** A flat, admin-only status lifecycle for each post, and an
admin triage view that scales past a handful of posts — search,
filter, and sort, all pushed down to the database. No roadmap UI, no
workflow engine, no public-facing status control.

- `post.status`: a real Postgres enum (`open` default, `under_review`,
  `planned`, `in_progress`, `complete`), plus `post.statusChangedAt`,
  updated together by one atomic `CASE`-guarded `UPDATE` so a
  same-status "change" is a true no-op for the timestamp
  (`DECISIONS.md` D6-001)
- Status is admin-only: `updateStatusAction` requires
  `requireActiveOrganization()`, then `updatePostStatus()`
  independently re-verifies the post belongs to that organization
  before writing — the same tenant-boundary pattern every other write
  in `lib/feedback/data.ts` uses, never trusting a client-supplied
  organization or post id
- Public board (`/b/[slug]`) and detail (`/b/[slug]/p/[postId]`) pages
  display the current status (`StatusBadge`) but render no control to
  change it — verified directly, not just by omission, in
  `e2e/status.spec.ts`
- Admin `/feedback` view: database-side search (title/description),
  status filter, and sort (newest/most votes/most comments), all
  expressed as URL search params and read server-side — no
  client-side filtering of a fully-loaded list
  (`components/feedback/admin-feedback-filters.tsx`)
- Performance fix: `listBoardPosts()`, `listOrganizationPostsForAdmin()`,
  and the two single-post detail reads replaced the M4/M5-era
  `leftJoin` + `count(distinct)` + `groupBy` vote/comment counting
  (Cartesian fan-out between two independent one-to-many relations)
  with per-post scalar correlated subqueries — no join, no row
  multiplication (`DECISIONS.md` D6-002)
- A real correctness bug was found and fixed in that same subquery
  work before it shipped: an earlier draft built the subqueries as raw
  `sql` templates with interpolated `Column` objects, which rendered
  the outer `post.id` reference unqualified and made it silently
  resolve to the *inner* table's own `id` column instead — every
  post's vote count and "did the viewer vote" flag was always `0`/
  `false` regardless of real data. Caught by a full Playwright run
  (two pre-existing M4 vote tests started failing), root-caused
  against local Postgres, and fixed by building the subqueries with
  the query builder instead of raw SQL interpolation
  (`DECISIONS.md` D6-003)
- Integration test proving the status update is tenant-scoped (a
  cross-organization `postId` is rejected, the post's status is
  unchanged), that `statusChangedAt` only moves on a real change, and
  that Postgres's own enum — not just Zod — rejects an invalid status
  value bypassing application validation
  (`tests/integration/status-update.test.ts`)
- Playwright coverage of the full lifecycle (submit → admin sees Open
  → search finds it → filter by status → change to Under Review →
  public reflects it → change to Planned → refresh persists, both
  admin and public), sort-by-votes/sort-by-comments ordering, and the
  public-pages-expose-no-control negative test
- Decision log entries `DECISIONS.md` D6-001–D6-003

**Explicitly out of scope for M6:** roadmap UI, changelog, notifications,
tags/categories, duplicate merging, AI/prioritization intelligence,
billing, CRM, private/internal notes, and any complex status-workflow
or moderation system.

## M7 — Public Roadmap

**Status:** Complete. Merged to `main` via PR #30 (SHA
`7dcb309df649a1c564c8bb5c99afd2e4e6022cda`). See
`validation/reports/M7-validation-report.md`. Automated code review
found one accessibility gap, fixed before merge: the roadmap card's
vote/comment counters had no accessible label beyond a bare number.

**Scope:** Completes the sellable customer journey — Feedback → Vote →
Discussion → Roadmap (Planned/In Progress/Complete). Roadmap is a
read-only *view* over the existing `Post`/status model, not a new
domain concept: no `roadmap_item` table, no roadmap-specific admin
console, no drag/drop, no dates or ETAs.

- Public route `/b/[slug]/roadmap`: three sections — Planned, In
  Progress, Complete — each ordered newest-`statusChangedAt`-first.
  `open`/`under_review` posts are excluded at the database query
  itself, never fetched and filtered in the browser
  (`lib/feedback/data.ts`'s `listRoadmapPosts()`, `DECISIONS.md`
  D7-001)
- New compound index `post_board_id_status_idx` on
  `(board_id, status)` backs the roadmap query
  (`drizzle/0004_dusty_iceman.sql`)
- `ROADMAP_STATUSES` (`lib/feedback/status.ts`) is the single source
  of truth for which three statuses are customer-facing, shared by the
  query and the UI's section headings
- `PublicBoardNav` (`components/feedback/public-board-nav.tsx`): clear
  Feedback ⇄ Roadmap navigation, shared by both `/b/[slug]` and
  `/b/[slug]/roadmap`
- Each roadmap card: title, status badge, vote count, comment count,
  linking to the same public post detail page M4/M5 already built — no
  new detail page, no duplication
- No separate roadmap-management console: the existing M6
  `StatusSelect` on the protected admin thread view is the only way a
  post's roadmap placement ever changes — Open/Under Review → hidden,
  Planned/In Progress/Complete → the matching section, automatically
- Tenant-scoped by construction — the same `boardId`-scoped pattern
  `listBoardPosts()` already uses; no separate assertion needed since
  the board itself was already resolved from a legitimate slug lookup
- Responsive: desktop uses a 3-column grid, mobile stacks to a single
  column, no horizontal overflow at either width
  (`e2e/roadmap.spec.ts`)
- Integration test proving `open`/`under_review` are excluded at the
  query (not merely unlisted in the UI), tenant isolation across
  boards, and newest-first ordering
  (`tests/integration/roadmap.test.ts`)
- Playwright coverage of the full lifecycle (submit → Planned appears
  → In Progress moves → Complete moves → refresh persists), the
  negative tests listed below, and accessibility/responsive checks
- A genuine (not flaky) test-timing bug found while building this
  milestone's E2E coverage — and confirmed already latent in M6's own
  merged `status.spec.ts` — is fixed: a Playwright status-change helper
  that waited only for the optimistic UI label, not the underlying
  mutation's network response, could let a subsequent navigation
  outrace the real database write (`DECISIONS.md` D7-003)
- A documented, non-defect finding: `/b/[slug]/roadmap`'s
  `notFound()` for an unknown board doesn't produce a literal HTTP 404
  under this Next.js version's Cache Components streaming
  architecture — the same pre-existing characteristic the already-
  shipped `/b/[slug]` board page has. Verified safe by what actually
  matters (no data leak, the generic not-found UI renders, `noindex`
  is set), not "fixed" by an out-of-scope architectural change
  (`DECISIONS.md` D7-002)
- Decision log entries `DECISIONS.md` D7-001–D7-003

**Explicitly out of scope for M7:** drag/drop, quarters, ETAs, dates or
promises, custom statuses or roadmap columns, a private roadmap,
roadmap item duplication, changelog, notifications, AI, CRM, billing,
enterprise features.

## M8 — Changelog + Close the Feedback Loop

**Status:** Complete. See `validation/reports/M8-validation-report.md`.

**Scope:** Completes the sellable closed loop — Feedback → Vote →
Discussion → Admin Triage → Roadmap → Complete → Changelog → notify
the interested customer. A genuine Changelog entity linked to Posts
through a junction table (never duplicating post content), an
explicit per-post "Follow updates" subscription (never inferred from
submitting/voting/commenting), and a deterministic, idempotent
notification delivery — no queue/worker infrastructure at this scale.

- `changelog_entry` (`draft`/`published` state, immutable once
  published) linked to `complete` posts only through
  `changelog_entry_post`, a junction table — Post remains the single
  source of truth for what was asked for (`lib/changelog/data.ts`,
  `DECISIONS.md` D8-001)
- Link rule enforced at the data layer, not just the picker UI: only
  a `complete` post in the same organization can be linked; publishing
  re-verifies every linked post is *still* `complete` before it
  proceeds, rejecting the publish outright if one regressed since
  being linked
- Admin `/changelog`: list, a real create-then-edit draft flow (never
  a blank placeholder row), a simple two-field editor (title + plain
  text body — no rich-text editor), a `complete`-only feedback picker
  showing vote/comment counts, and Publish
- Public `/b/[slug]/changelog`: published entries only, newest first,
  each showing its linked requests as links into the same public post
  detail page M4/M5 already built; `PublicBoardNav` now reads
  Feedback ⇄ Roadmap ⇄ Changelog everywhere
- `post_subscription`: the *only* thing that makes a participant an
  email recipient is an explicit "Follow updates" click on the public
  post detail page — never inferred from submitting, voting, or
  commenting. Unfollow works both from the page itself (cookie-
  identified) and from a single-purpose per-subscription
  `unsubscribeToken` reachable with no session at all, for the email
  link (`app/unsubscribe/[token]/page.tsx`, `DECISIONS.md` D8-003)
- Publishing computes recipients as the distinct set of participants
  following *any* of an entry's linked posts — a participant following
  two linked posts is one recipient, not two — and is idempotent by
  construction: an atomic `state = 'draft'`-guarded `UPDATE`, a unique
  constraint on `(changelog_entry_id, participant_id)`, both inside
  one transaction with the recipient-row insert, so a double publish,
  a retry, or a page refresh can never send a duplicate notification
  (`DECISIONS.md` D8-004)
- A `changelog_notification` delivery record per recipient
  (`pending`/`sent`/`failed`, with a truncated failure reason) is the
  deterministic outbox this scale calls for — no queue or worker
  process; the admin entry view shows a plain delivery summary
  ("N notified", "N failed" with a plain-language reason) rather than
  silently succeeding or failing
- Email goes through an `EmailTransport` interface — `ResendTransport`
  (a thin wrapper over the official `resend` SDK, its API inspected
  directly before writing any code) in production, a deterministic
  `FakeEmailTransport` in every test; no test in this suite makes a
  real network call (`DECISIONS.md` D8-002)
- Zero-env-safe: `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` are optional —
  a build or an unconfigured workspace never crashes; an actual
  publish attempt with email unconfigured still succeeds (the content
  goes live) while every notification is recorded `failed` with a
  truthful, visible reason, never silently dropped or falsely
  reported `sent` (`DECISIONS.md` D8-005)
- A second recurrence of the D6-003 unqualified-identifier subquery
  bug was found and fixed in `listCompletablePosts()`'s `linked` flag
  — caught by a real Playwright failure (the "Link" button never
  became "Unlink"), not by inspection — and is now a standing rule for
  every subquery in this codebase, not a one-off fix
  (`DECISIONS.md` D8-006)
- Security: only a verified workspace member creates/edits/publishes
  (`assertAuthorIsMember`, the same D5-003 pattern); tenant isolation
  proven directly for every changelog write (cross-org linking,
  cross-org read/edit); a draft is never returned by the public query,
  proven directly rather than assumed from the `WHERE` clause; the
  admin detail view exposes only aggregate delivery counts, never a
  recipient's email
- Integration tests covering tenant isolation, the link rule, publish-
  time revalidation, double-publish idempotency, the two-linked-posts-
  one-recipient case, the unsubscribed-gets-zero case, and the
  provider-failure path (`tests/integration/changelog.test.ts`,
  `tests/integration/post-subscription.test.ts`)
- Playwright coverage of the full business flow (submit → follow →
  vote/comment → admin completes → create changelog → link → publish
  → public changelog shows it → linked request visible → exactly one
  delivery record), tenant/security negatives, follow/unfollow, and
  accessibility/responsive checks (`e2e/changelog.spec.ts`)
- Decision log entries `DECISIONS.md` D8-001–D8-006

**PR #31 review response (2026-08-30):** All five automated-review
findings fixed at the root — entry-row `SELECT ... FOR UPDATE` locking
in `lib/changelog/data.ts` closes three TOCTOU races (an edit or a
link racing a publish, and publish's own "still Complete" check racing
a concurrent status change) by serializing every entry-mutating
function against the same row; `retryChangelogNotifications()` resumes
a published entry's `pending`/`failed` deliveries if the send loop was
interrupted partway through (a "Retry" button in the admin view);
`/unsubscribe/[token]` is now confirm-then-POST — a GET only ever
reads (`previewUnsubscribeByToken`), the deletion happens solely
through an explicit form submit, so a security scanner or client
prefetching the email link can no longer silently unsubscribe the real
recipient. Full detail and rejected alternatives in `DECISIONS.md`
D8-007; new coverage in `tests/integration/changelog.test.ts` (a real
lock-blocks-a-concurrent-write test and full `retryChangelogNotifications`
coverage). Full regression re-run clean: 65/65 unit, 32/32 integration,
98/98 Playwright, zero-env build, RepoGuard + self-test.

**Explicitly out of scope for M8:** reactions or comments on changelog
entries, announcement widgets or in-app popups, recipient segmentation,
CRM, AI-written release notes, automatic PR/GitHub release ingestion,
custom domains, Slack, webhooks, an analytics suite, billing,
enterprise features.

## M9 — Commercial Launch: Billing, Tracked Participants, UI/UX Polish

**Status:** In progress (this document is updated as each part completes;
see `validation/reports/M9-validation-report.md` for the authoritative
running record).

**Scope:** The last planned build milestone before real customer
testing — not new product surface area, but making the existing
product beautiful, trustworthy, billable, and sellable. Authorized
parts: A–P per the Product Owner's M9 instruction (UI/UX benchmark
against Canny and polish pass, a canonical tracked-participant metric,
Free/Pro plans with billing reused from the Product Owner's existing
Shopify store rather than a new payment stack, a commercial home/
pricing page, lightweight onboarding improvement, launch-readiness
checklist, legal/trust placeholder pages, a commercial end-to-end
test, and an explicit UI/UX acceptance-bar report). Revenue discipline
throughout: every change answers "does this help acquire, convert,
activate, retain, or bill the first 20–25 customers?" — anything that
doesn't is deferred, not built "because it'd be nice."

- **Tracked-participant metric (Part E):** one canonical calculation
  (`lib/billing/usage.ts`'s `countTrackedParticipants`) — an external
  participant who submitted feedback, voted, or posted a customer
  comment; never a workspace member's reply, never a participant who
  only followed a request or was merely identified, and never counted
  twice regardless of how many qualifying actions they took. Enforced
  at the one place a *new* tracked participant could be created
  (`assertWithinParticipantLimit`, called from `createPost`/`castVote`/
  `createExternalComment` in `lib/feedback/data.ts`) — an
  already-tracked participant's continued activity is never blocked,
  matching Part G's "never destroy existing customer data" rule.
  Proven directly: a real integration test seeds an org to its exact
  Free limit (25), shows a new participant's first action is rejected,
  and shows every already-tracked participant keeps working normally.
- **Billing provider — the Product Owner's existing Shopify store, not
  Stripe (Parts F/G/H/I):** researched live against current official
  Shopify documentation before writing any provider-specific code,
  confirming the store's checkout can sell "Feedback Pro" to any
  customer (not just Shopify merchants) via Selling Plans/Subscriptions,
  and confirming (the hard way — an initial simpler cart-permalink
  design didn't work, per Shopify's own documented limitation) that
  Checkout creation needs the Storefront API's `cartCreate` mutation.
  Full research findings, what was and wasn't reused, and the honest
  limitations are in `DECISIONS.md` D9-001. Two plans: Free (25 tracked
  participants, the full existing core loop) and Pro (100, ≈$99/month
  working target, centrally configurable in `lib/billing/plans.ts`).
  Checkout, webhook signature verification (HMAC-SHA256, Shopify's own
  documented recipe), idempotent processing (`billing_webhook_event`'s
  unique `(provider, provider_event_id)` index, the same D8-004
  pattern changelog delivery already uses), and entitlement
  reconciliation are all built and proven with real integration tests
  against a real database (signature rejection, redelivery idempotency,
  grant-on-`orders/paid`, revoke-on-`orders/cancelled` and
  `subscription_contracts/update`, tenant isolation). Billing access is
  restricted to workspace owner/admin roles. Entitlement logic
  (`lib/billing/plans.ts`/`usage.ts`) is provider-neutral by
  construction — it has no import from anything Shopify-specific, per
  the Product Owner's explicit "payment provider ≠ entitlement logic"
  rule. Zero-env-safe: all five `SHOPIFY_*` variables are optional, a
  zero-environment-variable production build succeeds with the billing
  page and webhook route both present, and every billing action fails
  loudly and truthfully rather than fabricating success when
  unconfigured.

## Future milestones (placeholders only)

Not started. Not scoped. Not authorized. Listed only so the sequence is
visible; each will be scoped in detail, one at a time, when authorized.

- **M10+** — to be defined once M9 is complete and real customer
  acquisition/market testing is underway; no scope decided yet.

Do not begin design or implementation work on any future milestone until
it is explicitly authorized.

## Standing directives for every future milestone

Recorded 2026-08-29 (`DECISIONS.md` D0-005), binding on M1 onward:

- **Reuse before rewrite, deliberately.** See
  [`docs/ENGINEERING_PRINCIPLES.md`](./docs/ENGINEERING_PRINCIPLES.md) —
  discover mature public resources before writing custom code; every
  dependency still has to justify itself.
- **Premium, Apple-inspired design standard.** See
  [`docs/DESIGN_PRINCIPLES.md`](./docs/DESIGN_PRINCIPLES.md) — applies
  to any user-facing screen from its first usable version, including
  accessibility, responsiveness, and the Tier 3 UI-validation
  extension.

These are documentation now, per Constitution Rules 11–12; they take
effect on implementation starting with the next approved milestone, not
retroactively and not as justification to start building ahead of
authorization.

Recorded 2026-08-29 (`DECISIONS.md` D2-004), positioning guidance for
whenever demand-intelligence/acquisition-related milestones are
authorized (not yet — Canny-style capture/organize/roadmap remains
first):

- **Two acquisition paths, evidence-driven proactive outreach.** See
  [`docs/PRODUCT_DIRECTION.md`](./docs/PRODUCT_DIRECTION.md) — design
  decisions should keep both self-serve and proactive-outreach
  acquisition viable, and any future demand-intelligence feature must
  be grounded in real customer feedback signal, never in scanning a
  prospect's site/product and asserting our own opinion of what's
  wrong (explicitly not a website-audit/SEO-scanning product).

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

**Status:** Complete (pending PR merge — see
`validation/reports/M5-validation-report.md`).

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

## Future milestones (placeholders only)

Not started. Not scoped. Not authorized. Listed only so the sequence is
visible; each will be scoped in detail, one at a time, when authorized.

- **M6+** — to be defined as the product proves itself

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

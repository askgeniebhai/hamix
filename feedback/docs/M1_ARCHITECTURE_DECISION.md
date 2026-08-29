# M1 Architecture Decision

**Status:** Decided 2026-08-29 (`DECISIONS.md` D1-001–D1-003). Research
and decision only — nothing here has been implemented. Builds directly
on the stack chosen in [`TECH_STACK.md`](./TECH_STACK.md) and stays
inside the constraints set by [`ARCHITECTURE.md`](../ARCHITECTURE.md):
one deployable unit, no microservices, no Kubernetes, no queues, no
distributed database, until real measured requirements justify them.

## Summary recommendation

One Next.js (App Router, TypeScript) application, one PostgreSQL
database (Neon), Better Auth for identity and organizations, deployed
as a single unit to Vercel. Multi-tenancy is enforced by a scoped
`organization_id` on every tenant-owned table plus a single shared
query-scoping helper — not separate databases or schemas per tenant.
This is the simplest architecture that can honestly support every
capability listed in the M1 task (workspaces, auth, feedback, voting,
comments, admin, roadmap, changelog, notifications, tracked-user usage,
subscriptions/billing) and can grow into AI/integrations later without
a rewrite.

## Why "simplest serious architecture" means this, not less

A single Next.js app with Server Actions and one Postgres database can
serve the API, the UI, and the data layer for every capability this
product needs at MVP scale. Splitting into separate frontend/backend
services, introducing a message queue, or sharding the database per
tenant would all solve problems this product does not have yet
(`ARCHITECTURE.md` Principle 2: no premature infrastructure). The
complexity that *is* warranted from day one is tenant isolation — not
because of scale, but because a feedback SaaS handling multiple
customers' data leaking across tenants is a correctness and trust
failure, not a performance one (`SECURITY.md`).

## Multi-tenancy model

**Shared database, shared schema, tenant-scoped rows** — the standard,
proven approach for this class of product (this is also how Fider, the
leading open-source Canny-alternative, and most B2B SaaS at this scale
operate; studied for its general approach, not its code — see
`PROJECT_CONSTITUTION.md` Rule 2).

- Every tenant-owned table carries a non-nullable `organization_id`
  foreign key.
- All reads/writes to tenant-owned tables go through a single internal
  data-access module that requires and applies the current
  organization's ID — application code does not hand-write
  unscoped queries against these tables. This is precisely why Drizzle
  (SQL-visible, no ORM magic hiding the scoping clause) was chosen in
  `TECH_STACK.md`.
- Better Auth's `organization()` plugin supplies the
  organization/membership/role model and the authenticated session's
  current organization; the data-access module reads the tenant ID
  from that session, not from client-supplied input.
- Negative tests (a user from organization A attempting to read/write
  organization B's data) are mandatory once this exists —
  `VALIDATION.md` Tier 3 and `SECURITY.md` both require this, not just
  happy-path tests.

**Rejected:** database-per-tenant or schema-per-tenant. Both add real
operational complexity (per-tenant migrations, connection routing) that
is only justified by isolation or compliance requirements this product
does not yet have; row-level scoping delivers the correctness guarantee
at a fraction of the operational cost, matching `ARCHITECTURE.md`'s
"earn complexity, don't pre-pay for it."

## Core domain shape (conceptual — no schema/migration is created in M1)

This is the entity relationship the stack must support, not a
database migration:

- **Organization** (tenant/workspace) — the root of isolation.
- **User** — a person; can belong to multiple Organizations via
  **Membership** (role: owner/admin/member — Better Auth's model).
- **Board/Project** — a feedback collection scoped to an Organization
  (an Organization can run more than one, e.g. "Mobile app", "API").
- **Post** — a feedback/feature request, scoped to a Board, with a
  Status (open/planned/in-progress/done/closed — configurable per
  Organization).
- **Vote** — one per (User, Post), scoped through the Post's
  Organization.
- **Comment** — scoped to a Post.
- **Tag/Category** — scoped to an Organization, attachable to Posts.
- **TrackedUser** — an end-customer of the Organization (not
  necessarily a Better Auth User) whose engagement is counted for
  usage-based billing tiers — this is the "tracked-user accounting"
  requirement and the thing Stripe's metered billing will read from.
- **Subscription** — an Organization's Stripe subscription/plan state,
  mirrored from Stripe webhooks, not treated as this app's source of
  truth for billing state (Stripe is the source of truth; we cache).

Roadmap and Changelog are views/states over Post (grouped by Status)
and a lightweight Changelog-entry table respectively — not separate
subsystems. Notifications are an outbound concern (Resend + in-app)
triggered by domain events (new comment, status change), not a queue-
backed system at this scale — a Server Action or scheduled function
enqueuing an email is sufficient until evidenced otherwise.

## Application layout (conceptual)

A conventional Next.js App Router layout, organized by domain rather
than by technical layer, keeping tenant-scoped modules easy to locate
and review:

```
app/                    routes (marketing, auth, app/[org]/... workspace routes)
lib/
  auth/                 Better Auth config + session/org helpers
  db/                   Drizzle schema, migrations, the tenant-scoped
                         data-access module (the single place queries
                         are written against tenant tables)
  billing/              Stripe client + webhook handlers, isolated so
                         Stripe-specific types don't leak into domain code
  email/                Resend client + React Email templates
components/
  ui/                   shadcn/ui primitives (owned, restyled per
                         DESIGN_PRINCIPLES.md's token system)
  <domain>/              feature-specific components (Post, Board, etc.)
```

This is intentionally conventional — no framework beyond what
`TECH_STACK.md` selected, so it is not defined further here; concrete
schema and folder decisions are implementation work for M2, not this
research milestone.

## Deployment topology

```
Browser
  │  HTTPS
  ▼
Vercel (Next.js: UI + API routes + Server Actions)
  │                              │
  ▼                              ▼
Neon Postgres (Drizzle)     Stripe / Resend / PostHog (external services,
  │                          reached via server-side calls, never
  ▼                          exposed directly to the browser)
Better Auth (co-located in
the Next.js app, session
data in Postgres)
```

One deployable unit. No separate backend service, no message broker,
no container orchestration. External services (Stripe, Resend,
PostHog) are called from server-side code only — API keys never reach
the browser, and webhook endpoints (Stripe) verify signatures before
trusting payloads, per `SECURITY.md`.

## How this satisfies the required capability list

| Capability | How the architecture supports it |
|---|---|
| Organizations/workspaces | Better Auth `organization()` plugin + Organization entity |
| Users/authentication | Better Auth |
| Multi-tenancy | `organization_id` row scoping, enforced in one data-access module |
| Feedback posts | Post entity, scoped to Board → Organization |
| Voting | Vote entity, unique per (User, Post) |
| Comments | Comment entity, scoped to Post |
| Admin management | Role-based access via Better Auth membership roles |
| Roadmap | A view over Post grouped by Status |
| Changelog | A lightweight Changelog-entry table, publishable per Organization |
| Notifications | Resend (email) triggered by domain events; in-app notifications are a future, evidence-driven addition |
| Tracked-user usage | TrackedUser entity feeding Stripe metered billing |
| Subscriptions/billing | Stripe Billing, mirrored into a Subscription cache table |
| Future AI/intelligence | Deferred (see `TECH_STACK.md`); the domain model (Post, Comment, Tag) is already shaped to feed it later without restructuring |
| Future integrations | Deferred; server-side service modules (like `lib/billing/`, `lib/email/`) are the established pattern any future integration follows |

## What M1 explicitly does not do

No schema is created, no dependency is installed, no code is written
against this architecture, and no repository scaffold exists yet. This
document and `TECH_STACK.md` are the authorized output of M1. Building
against this architecture is M2's work and requires separate
authorization per `MILESTONES.md`.

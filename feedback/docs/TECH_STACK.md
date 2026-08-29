# Tech Stack — M1 Decision

**Status:** Decided 2026-08-29. Binding for M2 onward until superseded by
a new decision recorded in `DECISIONS.md`. One recommended stack per
category — not a menu of options. Selection follows
[`ENGINEERING_PRINCIPLES.md`](./ENGINEERING_PRINCIPLES.md) (reuse
mature public resources) and
[`DESIGN_PRINCIPLES.md`](./DESIGN_PRINCIPLES.md) (premium UI capability)
and stays inside `ARCHITECTURE.md`'s "simplest architecture that can
become a serious SaaS" principle: one deployable app, one database,
no microservices/queues/Kubernetes.

Format per row: **CHOICE / WHY / ALTERNATIVES REJECTED / COST / LICENSE
/ RISK.**

## Frontend + backend

- **CHOICE:** Next.js (App Router) + TypeScript, React Server
  Components and Server Actions, deployed as one application.
- **WHY:** One framework covers UI, API routes, and server-side data
  mutations — matches the "one deployable unit" principle and avoids a
  separate backend service. App Router is the actively developed,
  production-recommended path in 2026 (Pages Router is in maintenance
  mode); Server Components cut client JS meaningfully on dashboard-style
  apps like this one.
- **ALTERNATIVES REJECTED:** A separate SPA (React/Vite) + standalone
  API (Express/Nest/Fastify) — two deployables, two auth boundaries,
  more infrastructure than an M1-stage product needs. Remix — smaller
  ecosystem/hiring pool, no material advantage here.
- **COST:** $0 (open source framework itself); hosting cost below.
- **LICENSE:** MIT.
- **RISK:** App Router patterns (Server Actions, caching) are still
  young compared to the old Pages Router — mitigate by following
  official Next.js docs and keeping data-mutation logic in typed,
  testable functions rather than deep in components.

## Database

- **CHOICE:** PostgreSQL, hosted on Neon (serverless Postgres).
- **WHY:** Postgres is the boring, proven, relational choice for
  multi-tenant SaaS data (strong constraints, row-level scoping,
  mature tooling). Neon adds branching (a real Postgres branch per
  preview/PR — valuable for our validation pipeline), scale-to-zero on
  idle, and a usable free tier for development. Owned by Databricks
  since 2025 — durable backing.
- **ALTERNATIVES REJECTED:** Supabase — bundles auth/storage we don't
  need since Better Auth (below) already covers auth; still a fine
  fallback if we later want its storage/realtime features. Self-managed
  Postgres (RDS/VM) — more operational burden than an M1-stage team
  should carry. MongoDB — feedback/voting/roadmap data is inherently
  relational (tenants, users, posts, votes, statuses); a document store
  fights that.
- **COST:** Free tier: 100 CU-hours/month, 0.5GB storage per project.
  Paid (Launch): $0.106/CU-hour compute + $0.35/GB-month storage, no
  monthly minimum. Expect $0–15/month at M1–M2 scale.
- **LICENSE:** PostgreSQL license (permissive); Neon service is
  proprietary-hosted (not self-hostable at the free tier, but data is
  plain Postgres — no lock-in on the data itself).
- **RISK:** Vendor dependency on Neon's hosted service. Mitigated:
  standard Postgres wire protocol means migrating to another Postgres
  host (RDS, Supabase, self-hosted) is a `pg_dump`/`pg_restore` away,
  not a rewrite.

## ORM / database access

- **CHOICE:** Drizzle ORM (+ `drizzle-kit` for migrations).
- **WHY:** SQL-close, TypeScript-native schema, no hidden query
  magic — every query's tenant-scoping (`WHERE organization_id = ...`)
  is visible in the code that authors and reviewers actually read,
  which matters directly for `SECURITY.md`'s tenant-isolation
  requirement. Smaller runtime footprint, favorable for serverless
  cold starts on Vercel functions.
- **ALTERNATIVES REJECTED:** Prisma — Prisma 7's new TS/WASM engine
  closed most of the historical cold-start/bundle gap, and its schema
  DSL + Prisma Studio are genuinely nice; rejected specifically because
  Drizzle's closeness to SQL is safer for a security requirement
  (tenant isolation) that depends on every query being scoped
  correctly, not on trusting an abstraction. Raw `pg`/query builder
  with no ORM — reinvents migration tooling and type-safety Drizzle
  already provides for free (Rule 11 reuse-first).
- **COST:** $0 (library, no hosted service).
- **LICENSE:** Apache-2.0.
- **RISK:** Smaller ecosystem/plugin surface than Prisma. Mitigated:
  our needs (typed queries, migrations, tenant scoping) are exactly
  Drizzle's core, well-supported use case.

## Authentication & multi-tenancy

- **CHOICE:** Better Auth, using its `organization()` plugin for
  workspaces/tenants and RBAC.
- **WHY:** This is the single highest-leverage choice for this
  product: Better Auth ships a documented, typed organizations +
  membership + roles model out of the box (workspace = tenant is this
  product's core concept from day one), versus building that schema
  and access-control layer by hand. MIT-licensed, self-hosted (no
  per-user fee, unlike Clerk), and acquired by Vercel in early 2026 —
  it is now the maintained successor to Auth.js/NextAuth and pairs
  naturally with our Next.js/Vercel choice.
- **ALTERNATIVES REJECTED:** Auth.js/NextAuth — no built-in
  organization/tenant model; would require building the membership and
  RBAC schema from scratch, which is exactly the commodity-plumbing
  work Rule 11 says to avoid. Clerk — excellent product, but per-MAU
  pricing scales against a free-entry, expansion-driven business model
  before revenue exists to cover it. Supabase Auth — fine if we were
  already on Supabase for the database; we are not (see Database
  above).
- **COST:** $0 (self-hosted, open source). Optional Better Auth Cloud
  add-ons exist but are not required.
- **LICENSE:** MIT.
- **RISK:** Newer project (2024) than Auth.js, though now
  Vercel-backed with $5M seed funding, 28k+ GitHub stars, and 150k+
  weekly downloads. Mitigated: it sits behind a thin internal
  auth-service module (see `M1_ARCHITECTURE_DECISION.md`) so a future
  swap, if ever needed, is isolated rather than repo-wide.

## UI / component primitives + styling

- **CHOICE:** Tailwind CSS + shadcn/ui (Radix/Base UI primitives,
  copied into our repo, not installed as a black-box dependency).
- **WHY:** shadcn/ui components are generated into our own codebase, so
  every primitive (Button, Card, Dialog, Tabs, Table, Toast, etc. — the
  exact list `DESIGN_PRINCIPLES.md` calls for) is fully ours to restyle
  into the calm, Apple-inspired token system that document requires,
  while still inheriting Radix/Base UI's accessibility (keyboard nav,
  focus management, ARIA) for free. Tailwind gives the spacing/
  typography/radius token discipline `DESIGN_PRINCIPLES.md` requires
  without hand-rolled CSS.
- **ALTERNATIVES REJECTED:** MUI / Ant Design / Chakra — opinionated
  visual identity that reads as "generic admin dashboard," the exact
  look `DESIGN_PRINCIPLES.md` says to avoid, and harder to restyle to a
  premium custom identity than owning the component source. A fully
  custom component library from scratch — reinvents accessible
  primitives Radix/Base UI already solved (Rule 11).
- **COST:** $0.
- **LICENSE:** MIT (Tailwind, shadcn/ui, Radix UI, Base UI all MIT).
- **RISK:** Because components are copied in, we own their maintenance
  (no automatic upstream bugfixes). Acceptable trade for full design
  control; kept small by only pulling primitives we actually use.

## Validation

- **CHOICE:** Zod (v4) for schema validation, on both Server Action
  inputs and form inputs (paired with `react-hook-form` +
  `@hookform/resolvers/zod` for forms).
- **WHY:** Validate once at the boundary (`SECURITY.md`'s input-
  validation requirement) and derive TypeScript types from the same
  schema instead of maintaining types and validation separately. Zod 4
  is markedly faster and smaller than v3, and is already the de facto
  standard across the rest of this stack's ecosystem (works with
  Drizzle via `drizzle-zod`, React Hook Form).
- **ALTERNATIVES REJECTED:** Yup — smaller ecosystem, weaker
  TypeScript inference. Hand-written validation — reinvents a solved
  problem (Rule 11) and drifts from types over time.
- **COST:** $0.
- **LICENSE:** MIT.
- **RISK:** Low — mature, widely adopted; v4's API changes are
  additive/rename-level, not conceptual.

## Unit testing

- **CHOICE:** Vitest.
- **WHY:** Native ESM/TypeScript, shares config with Vite-based
  tooling, materially faster iteration than Jest, and is Next.js's
  co-documented option. Fits synchronous component and business-logic
  (tenant scoping, pricing math, etc.) unit tests.
- **ALTERNATIVES REJECTED:** Jest — still viable, officially
  documented by Next.js too, but slower feedback loop and heavier
  ESM/TS configuration; no advantage over Vitest for a new project.
- **COST:** $0.
- **LICENSE:** MIT.
- **RISK:** Cannot unit-test async Server Components directly (a
  known ecosystem-wide gap, not specific to Vitest) — covered instead
  by Playwright E2E per `VALIDATION.md` Tier 3.

## Browser E2E testing

- **CHOICE:** Playwright.
- **WHY:** Cross-browser (Chromium/Firefox/WebKit), free built-in
  parallelization (no paid cloud tier required, unlike Cypress Cloud),
  lower CI cost, and directly satisfies `VALIDATION.md` Tier 3's "real
  browser E2E automation" requirement, including the negative
  cross-tenant-access tests `SECURITY.md` requires.
- **ALTERNATIVES REJECTED:** Cypress — strong DX, but single-browser-
  context model and paid Cloud tier for parallelization/recording work
  against our cost-discipline directive.
- **COST:** $0 (self-hosted runs in our own CI).
- **LICENSE:** Apache-2.0.
- **RISK:** Low — mature, Microsoft-backed, broad adoption.

## Billing / subscriptions

- **CHOICE:** Stripe Billing (Checkout + Customer Portal + webhooks).
- **WHY:** This product's entire business model (free entry → paid
  tiers → usage expansion → enterprise) maps directly onto Stripe's
  subscription primitives (Products, Prices, Subscriptions, metered
  usage records). Handles PCI compliance, dunning, proration, and the
  Customer Portal (self-serve plan changes/cancellation) out of the
  box — exactly the kind of commodity infrastructure Rule 11 says to
  reuse rather than build.
- **ALTERNATIVES REJECTED:** Paddle — Merchant-of-Record model (handles
  global tax) is attractive later, but adds fee overhead and less
  flexibility now; revisit if/when international tax complexity
  justifies it. Custom billing — reinvents PCI-scope, invoicing, and
  dunning logic that is a solved, high-liability problem.
- **COST:** No monthly fee. 2.9% + $0.30 per card transaction, plus
  0.7% of billing volume for the Billing product itself. Revenue-
  proportional, not fixed.
- **LICENSE:** N/A (hosted service, not a library).
- **RISK:** Vendor lock-in on billing logic. Mitigated: isolate billing
  calls behind an internal module (see architecture doc) so webhooks
  and Stripe-specific objects don't leak into core domain logic.

## Email / notifications

- **CHOICE:** Resend, with React Email for templates.
- **WHY:** Templates as React components fit directly into our
  Next.js/TypeScript codebase (no separate templating system to
  maintain), generous free tier (3,000 emails/month) for early usage,
  and first-class Next.js integration.
- **ALTERNATIVES REJECTED:** Postmark — better long-track-record
  reputation isolation between transactional and broadcast mail;
  worth revisiting if/when deliverability at scale becomes a measured
  problem, not a day-one concern. SES — cheapest at scale but requires
  more manual reputation/deliverability management than an M1-stage
  team should take on.
- **COST:** Free up to 3,000 emails/month; $20/month for 50,000
  beyond that.
- **LICENSE:** N/A (hosted service); `react-email` components are MIT.
- **RISK:** Shared sending infrastructure (less reputation isolation
  than Postmark). Acceptable at current volume; documented here so a
  future switch is a deliberate, evidenced decision, not a surprise.

## Deployment / hosting

- **CHOICE:** Vercel (Pro plan).
- **WHY:** First-party Next.js hosting — zero-config CI/CD, per-PR
  preview deployments (pairs well with our PR-gated validation
  pipeline), edge network, and the same vendor now behind Better Auth.
  Hobby tier is free but Terms-of-Service-restricted to non-commercial
  use, so a paid-from-day-one SaaS requires Pro regardless of traffic.
- **ALTERNATIVES REJECTED:** Self-managed VM/container (Hetzner,
  DigitalOcean, Fly.io) — cheaper at very small scale but adds
  deployment/ops work this milestone's "simplest architecture" principle
  argues against; revisit only if Vercel's pricing model stops fitting
  at real scale. Netlify/Cloudflare Pages — less mature Next.js App
  Router / Server Actions support than Vercel, which builds Next.js
  itself.
- **COST:** $20/developer seat/month (includes $20 of usage credit);
  overages billed beyond that (e.g. $40/100GB bandwidth over 1TB).
- **LICENSE:** N/A (hosted service).
- **RISK:** Vendor lock-in and cost growth with traffic. Mitigated:
  Next.js itself is portable (self-hostable), so Vercel is a hosting
  choice, not an architectural one — revisit if/when usage-driven cost
  materially changes the economics.

## Observability (analytics, errors, flags)

- **CHOICE:** PostHog.
- **WHY:** One vendor covers product analytics, error tracking, session
  replay, and feature flags — directly relevant to this product's
  "tracked-user/customer accounting" requirement and to iterating on
  the feedback/voting/roadmap workflow post-launch. Consolidating onto
  one tool (Rule 11: minimize tool sprawl) also means one bill and one
  integration instead of three.
- **ALTERNATIVES REJECTED:** Sentry alone — best-in-class error
  tracking specifically, but would need a second tool (analytics) added
  regardless; not chosen as the sole tool, though worth adding
  alongside PostHog later if error-tracking depth becomes a measured
  gap. Building custom analytics — squarely the commodity plumbing
  Rule 11 says to avoid.
- **COST:** Free tier: 1M analytics events, 100k exceptions, 5k session
  replays/month. Usage-based pricing beyond that, starting at
  $0.00037/exception.
- **LICENSE:** MIT core (self-hostable), hosted-cloud service used
  here for zero ops overhead.
- **RISK:** Less specialized error-tracking depth than a dedicated
  Sentry setup. Acceptable at M1–M2 scale; documented so adding Sentry
  later, if warranted by evidence, is a deliberate add, not a rebuild.

## CI/CD

- **CHOICE:** GitHub Actions (continuing the pattern already
  established by `feedback-ci.yml` in M0).
- **WHY:** Already the repository's existing convention; no new vendor
  or tool needed. Free minutes cover this project's scale for the
  foreseeable future.
- **ALTERNATIVES REJECTED:** Not evaluated — no reason to introduce a
  second CI system alongside the one already in place and working.
- **COST:** $0 at current scale (within free included minutes).
- **LICENSE:** N/A.
- **RISK:** None material at this scale.

## Deferred (not decided in M1)

- **Future AI/intelligence features:** No vendor selected. Likely
  candidate: the Claude API (Anthropic), given the existing tooling
  relationship — decided when a specific milestone defines the actual
  feature (e.g. duplicate-feedback detection, summarization), with its
  own CHOICE/WHY/COST/RISK entry at that time.
- **Future third-party integrations** (Slack, Jira, Linear, etc.): no
  selection — out of scope until a milestone defines which integration
  and why.

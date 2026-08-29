# Decision Log

Architecture and process decisions for this project, in chronological
order. Each entry is short: what was decided, why, and what was
rejected. This is a log, not a design document — see `ARCHITECTURE.md`
for the current state.

---

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

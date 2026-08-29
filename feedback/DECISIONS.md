# Decision Log

Architecture and process decisions for this project, in chronological
order. Each entry is short: what was decided, why, and what was
rejected. This is a log, not a design document — see `ARCHITECTURE.md`
for the current state.

---

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

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

**Status:** Complete (pending PR merge — see
`validation/reports/M2-validation-report.md`).

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

## Future milestones (placeholders only)

Not started. Not scoped. Not authorized. Listed only so the sequence is
visible; each will be scoped in detail, one at a time, when authorized.

- **M3 — Workspace & authentication foundation**
- **M4 — Feedback submission & voting**
- **M5+** — to be defined as the product proves itself

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

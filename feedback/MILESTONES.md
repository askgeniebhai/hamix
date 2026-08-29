# Milestones

Only one milestone is authorized and in progress at a time (Constitution
Rule 4). Do not start the next milestone without explicit Product Owner
authorization, even if it seems obvious.

## M0 — Foundation & Governance

**Status:** In progress (see `validation/reports/` for the current
report; final status is recorded there).

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

## Future milestones (placeholders only)

Not started. Not scoped. Not authorized. Listed only so the sequence is
visible; each will be scoped in detail, one at a time, when authorized.

- **M1 — Technology stack selection & minimal running skeleton**
- **M2 — Workspace & authentication foundation**
- **M3 — Feedback submission & voting**
- **M4+** — to be defined as the product proves itself

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

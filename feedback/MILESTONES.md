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

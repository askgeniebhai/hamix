# Validation Report — M1: Architecture & Tech Stack Selection

- **Milestone ID:** M1
- **Objective:** Research and decide the simplest serious-SaaS
  technology stack and high-level architecture for the `feedback`
  product. Research and decision only — no product code, schema,
  dependency installation, or UI work.
- **Repository:** `askgeniebhai/hamix`
- **Branch:** `claude/feedback-m1-architecture`
- **Starting SHA:** `070dafa9e2a3cd896b0a05b22a20276cb293d599` (tip of
  `main` immediately after PR #22 / M0 merged)
- **Ending SHA:** recorded in the PR — see final report for this
  branch's pushed HEAD.
- **Files changed:** 6 files, all under `feedback/**`:
  - `feedback/docs/TECH_STACK.md` (new)
  - `feedback/docs/M1_ARCHITECTURE_DECISION.md` (new)
  - `feedback/docs/README.md` (updated index)
  - `feedback/ARCHITECTURE.md` (updated to point at the M1 decision)
  - `feedback/MILESTONES.md` (M0 marked complete, M1 scoped and marked
    complete, M2+ placeholders adjusted)
  - `feedback/DECISIONS.md` (D1-001–D1-003 added)

## Research method

Per the M1 task and `docs/ENGINEERING_PRINCIPLES.md` ("search/inspect
first when facts are available"), each major stack category was
researched via live web search against current (2026) sources before
deciding, rather than relying solely on training-data memory that could
be stale by the time of this milestone. Areas researched: Next.js App
Router status, Drizzle vs. Prisma, Better Auth vs. Auth.js/NextAuth for
multi-tenant SaaS, shadcn/ui + Radix/Base UI status, Neon Postgres
pricing, Stripe Billing practices, Vercel pricing, Resend vs. Postmark,
Playwright vs. Cypress, open-source Canny alternatives (for business-
model/architecture pattern reference, not code), Sentry vs. PostHog,
Zod v4 status, Better Auth license/maturity, and Vitest status. Sources
are the search results themselves (official docs and independent 2026
comparison articles); no proprietary competitor source code, design, or
copy was accessed or reproduced anywhere in this research.

## Tier 1 — Code / Static Quality (documentation/governance interpretation)

**Result: PASS**

| Check | Result |
|---|---|
| RepoGuard (Scope, Boundary, Conflict, Secret, Dangerous-File, Git-Hygiene, Governance) | PASS |
| RepoGuard self-test (12 synthetic-fixture assertions) | PASS |
| Internal cross-document links (`TECH_STACK.md`, `M1_ARCHITECTURE_DECISION.md`, `ARCHITECTURE.md`, `MILESTONES.md`, `DECISIONS.md`, `docs/README.md`) resolve to real files | PASS — verified programmatically, no broken relative links |
| Every major stack choice states CHOICE / WHY / ALTERNATIVES REJECTED / COST / LICENSE / RISK | PASS — verified by manual review of `TECH_STACK.md`, all 13 categories present |
| Exactly one recommended stack (not multiple options left open) | PASS — each category names one CHOICE; alternatives are explicitly marked rejected, not left as open options |

## Tier 2 — Build / Integration (bootstrap interpretation)

**Result: PASS**

Still no application runtime — M1 produces no code. Tier 2 proves the
governance/tooling pipeline still holds after this milestone's changes:

| Check | Command | Result |
|---|---|---|
| RepoGuard executes against real committed state | `node feedback/scripts/repo-guard.js --base origin/main` | PASS |
| Governance file set still complete | RepoGuard Governance Guard | PASS — all 7 required files still present |
| No JSON/JS added this milestone needing syntax validation | `find feedback -name '*.js' -o -name '*.json'` (new files) | NOT APPLICABLE — this milestone added Markdown only |
| CI (`feedback-ci.yml`) unaffected — no workflow change this milestone | `git diff origin/main..HEAD -- .github/workflows/feedback-ci.yml` | PASS — empty diff, existing CI pipeline runs unmodified against these doc changes |

## Tier 3 — Real Runtime / End-to-End (bootstrap interpretation)

**Result: PASS**

| Check | Command | Result |
|---|---|---|
| Boundary verification (independent of RepoGuard's own logic) | `git diff --name-only origin/main..HEAD` reviewed against `feedback/**` | PASS — only the 6 files listed above |
| HAMIX application untouched | `git diff origin/main..HEAD -- <any path outside feedback/>` | PASS — empty |
| Clean-checkout reproducibility | RepoGuard and self-test re-run after commit, from the actual committed tree | PASS |

This remains the bootstrap interpretation of Tier 3 defined in
`VALIDATION.md` — there is still no application runtime to exercise.
`VALIDATION.md`'s Tier 3 UI-validation extension does not yet apply;
it activates once M2+ produces user-facing screens.

## Failures discovered

None. No check, guard, or validation step was skipped, weakened, or
marked `NOT APPLICABLE` to obtain a passing result; the `NOT
APPLICABLE` markings above reflect checks that are genuinely
inapplicable to a documentation-only milestone (no JS/JSON added, no
CI workflow touched), not skipped mandatory checks.

## Security observations

- No secrets, credentials, or dangerous files introduced (RepoGuard
  Secret Guard / Dangerous File Guard both pass; manual review
  confirms all changed files are Markdown documentation).
- The architecture decision itself is security-relevant and reviewed
  as such: `M1_ARCHITECTURE_DECISION.md`'s multi-tenancy model puts
  tenant-scoping in one auditable data-access module specifically so
  the cross-tenant-isolation requirement in `SECURITY.md` has a single
  place to verify and test once implementation begins, rather than
  being scattered across ad hoc queries.
- No credentials, API keys, or connection strings for any selected
  service (Neon, Stripe, Resend, PostHog, Vercel) were requested,
  generated, or committed — none of these services were provisioned in
  M1; only the decision to use them was recorded.

## Known limitations

- This is a decision record, not a proof of implementation feasibility.
  Cost figures in `TECH_STACK.md` are current published pricing as of
  this research (2026) and will need re-verification at actual
  implementation/provisioning time in M2+.
- Several chosen vendors (Better Auth, Resend, PostHog, Neon) are
  younger or more recently changed (e.g. Better Auth's 2026 Vercel
  acquisition) than the incumbents they were chosen over; each has a
  documented RISK entry and mitigation in `TECH_STACK.md` rather than
  being treated as risk-free.
- No proof-of-concept or spike code was written to validate these
  choices technically — that validation happens in M2, which is where
  Tier 2/3 will next mean real build/integration/runtime checks rather
  than this milestone's bootstrap interpretation.

## Final `git status` (at time of this report, before push)

```
On branch claude/feedback-m1-architecture
Changes to be committed:
  (files listed above, all under feedback/**)
```

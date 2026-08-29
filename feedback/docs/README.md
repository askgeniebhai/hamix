# docs/

Supplementary documentation for this project that doesn't belong in one
of the top-level governance files (`README.md`, `PROJECT_CONSTITUTION.md`,
`ARCHITECTURE.md`, `MILESTONES.md`, `VALIDATION.md`, `SECURITY.md`,
`DECISIONS.md`).

- [`ENGINEERING_PRINCIPLES.md`](./ENGINEERING_PRINCIPLES.md) — reuse
  mature public resources before writing custom code; token/tooling
  discipline; dependency and license discipline. Referenced by
  `PROJECT_CONSTITUTION.md` Rule 11.
- [`DESIGN_PRINCIPLES.md`](./DESIGN_PRINCIPLES.md) — the premium,
  Apple-inspired UI/UX standard, design system requirements,
  accessibility, responsiveness, and the Tier 3 UI-validation
  extension. Referenced by `PROJECT_CONSTITUTION.md` Rule 12.
- [`TECH_STACK.md`](./TECH_STACK.md) — the M1 technology stack
  decision: one recommended choice per category (framework, database,
  ORM, auth, UI, validation, testing, billing, email, hosting,
  observability), each with why, alternatives rejected, cost, license,
  and risk.
- [`M1_ARCHITECTURE_DECISION.md`](./M1_ARCHITECTURE_DECISION.md) — how
  that stack fits together: the multi-tenancy model, conceptual domain
  shape, application layout, and deployment topology.
- [`PRODUCT_DIRECTION.md`](./PRODUCT_DIRECTION.md) — the two customer-
  acquisition paths (self-serve and proactive outreach) and the
  evidence-driven demand-intelligence positioning the product should
  grow into. Positioning only — not an implementation authorization.

Populated further as future milestones produce documentation worth
keeping (e.g. API references, ADRs too detailed for `DECISIONS.md`,
onboarding notes).

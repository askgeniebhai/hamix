# feedback (working name)

An independent, original SaaS project reproducing the proven **customer
feedback management** business model (public/private feedback boards,
voting, roadmap, changelog) as a standalone product — free entry,
paid subscription tiers, expansion to enterprise. Customers are
acquired both self-serve and through proactive outreach; see
[`docs/PRODUCT_DIRECTION.md`](./docs/PRODUCT_DIRECTION.md).

This is **not** a fork, clone, or reuse of any competitor's code, design,
copy, or branding. It reproduces a proven *product category and business
mechanism*, not any proprietary implementation. See
[`PROJECT_CONSTITUTION.md`](./PROJECT_CONSTITUTION.md) for the ground rules
and [`SECURITY.md`](./SECURITY.md) for the security baseline this rule
implies in practice.

`feedback` is a placeholder name and will be renamed before public launch.

## Relationship to this repository

This directory is a **completely separate project** living inside the
HAMIX repository purely as a Git hosting convenience. It:

- does not import, call, or depend on any HAMIX application code,
- does not share HAMIX's database, API, authentication, UI, or deployment,
- does not modify any file outside `feedback/**` (the only exception is
  its own CI workflow at `.github/workflows/feedback-ci.yml`).

Every change to this project must stay inside the `feedback/**` boundary.
[`feedback/scripts/repo-guard.js`](./scripts/repo-guard.js) enforces this
mechanically in CI and can be run locally.

## Status

**Milestone 0 — Foundation & Governance.** There is no application runtime
yet. This milestone establishes governance documents, the RepoGuard
validator, and the three-tier validation framework that every future
milestone will build on. See [`MILESTONES.md`](./MILESTONES.md).

## Repository layout

```
feedback/
├── README.md                  this file
├── PROJECT_CONSTITUTION.md    permanent project rules
├── ARCHITECTURE.md            high-level engineering boundaries
├── MILESTONES.md              milestone tracker
├── VALIDATION.md              three-tier validation framework
├── SECURITY.md                security baseline requirements
├── DECISIONS.md               architecture decision log
├── docs/                      supplementary documentation
├── scripts/
│   └── repo-guard.js          deterministic repository guard
└── validation/
    └── reports/                per-milestone validation reports
```

## Running RepoGuard locally

```
node feedback/scripts/repo-guard.js            # validate current state
node feedback/scripts/repo-guard.js --self-test # prove the guard itself works
```

No dependencies are required — RepoGuard is a dependency-free Node.js
script, matching the Node.js tooling already used elsewhere in this
repository.

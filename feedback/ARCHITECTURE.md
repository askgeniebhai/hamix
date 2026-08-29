# Architecture

This document describes high-level boundaries and engineering
principles. It is stack-agnostic by design — see
[`docs/TECH_STACK.md`](./docs/TECH_STACK.md) for the M1 technology
stack decision and
[`docs/M1_ARCHITECTURE_DECISION.md`](./docs/M1_ARCHITECTURE_DECISION.md)
for how that stack fits these principles (multi-tenancy model, domain
shape, deployment topology). Implementation against that decision is
M2's work, not started here.

## Project boundary

```
feedback/**                          this project's entire surface
.github/workflows/feedback-*.yml     this project's CI only
```

Nothing outside those paths is touched by this project. This project
does not read from, write to, or link against any HAMIX code, database,
API, session, or deployment. [`RepoGuard`](./scripts/repo-guard.js)
enforces this mechanically.

## Guiding principles

1. **Simplest architecture that can become a serious SaaS.** Start as a
   conventional, boring, well-understood application. Earn complexity;
   don't pre-pay for it.
2. **No premature infrastructure.** No microservices, Kubernetes, event
   buses, distributed databases, message queues, or elaborate cloud
   topologies until real, evidenced requirements justify them (e.g.
   measured load, not anticipated load).
3. **Multi-tenant from day one, simple from day one.** The eventual
   product serves multiple customer workspaces. Tenant isolation is a
   day-one *design constraint*, even while the implementation itself
   stays simple (e.g. a tenant/workspace column and enforced scoping,
   not a separate database per tenant).
4. **One deployable unit until proven otherwise.** A single application
   (web UI + API) backed by a single relational datastore is the
   default assumption for the initial product build.
5. **Boring, reviewable technology.** Prefer widely-adopted, well
   documented tools over novel ones. Every dependency is a liability;
   justify additions.
6. **Governance and validation are part of the architecture.** RepoGuard
   and the three-tier validation framework (see
   [`VALIDATION.md`](./VALIDATION.md)) are first-class, permanent parts
   of this project, not optional tooling bolted on later.
7. **Reuse mature public resources before building custom.** See
   [`docs/ENGINEERING_PRINCIPLES.md`](./docs/ENGINEERING_PRINCIPLES.md).
   This applies to framework/library selection once the stack is
   chosen, not just to product features.
8. **User-facing surfaces meet a premium design standard from day
   one.** See [`docs/DESIGN_PRINCIPLES.md`](./docs/DESIGN_PRINCIPLES.md).
   UI/component library selection (once the stack is chosen) is
   evaluated against that standard, not against novelty or popularity
   alone.

## What is decided vs. still deferred

As of M1 (`docs/TECH_STACK.md`, `docs/M1_ARCHITECTURE_DECISION.md`):
programming language/framework, database, ORM, auth mechanism, UI
primitives, validation, testing, billing provider, email, hosting, and
observability are **decided**. Concrete API shape and database
schema/migrations are still deferred — that is M2's implementation
work, not this research milestone's. Vendor/tool choices for future AI
features and third-party integrations remain deliberately undecided
until a milestone defines the specific feature.

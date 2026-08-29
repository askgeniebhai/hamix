# Architecture (Milestone 0)

This document describes only high-level boundaries and engineering
principles. **No technology stack has been chosen yet.** It will be
selected deliberately, with justification recorded in
[`DECISIONS.md`](./DECISIONS.md), before product implementation (M1+)
begins.

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

## What this milestone does NOT define

- Programming language / framework choice
- Database choice
- Hosting / deployment target
- Authentication mechanism
- Billing provider
- API shape or data model

These are deliberately deferred until the Product Owner authorizes the
milestone that selects the stack.

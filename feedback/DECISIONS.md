# Decision Log

Architecture and process decisions for this project, in chronological
order. Each entry is short: what was decided, why, and what was
rejected. This is a log, not a design document — see `ARCHITECTURE.md`
for the current state.

---

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

# Validation Framework

Every milestone, from M0 onward, is validated on three tiers. A milestone
is not complete until all three tiers pass and a report exists in
`feedback/validation/reports/`.

Only three verdicts are used in reports: `PASS`, `FAIL`, `NOT
APPLICABLE`. A verdict is never omitted or hidden.

## Tier 1 — Code / Static Quality

Validates the code and configuration without running the application.
As the project grows, Tier 1 includes whichever of the following are
relevant:

- RepoGuard (scope, conflict, secret, dangerous-file, git-hygiene,
  governance, and boundary checks)
- formatting
- lint
- syntax validation
- type checking
- configuration validation
- dependency validation
- unit tests
- secret scanning
- conflict-marker checks

**M0 interpretation:** there is no application code yet. Tier 1 for M0
validates the project foundation itself (governance files exist and are
well-formed) and RepoGuard's own correctness (`repo-guard.js
--self-test`, which exercises each guard against both a passing and a
deliberately failing fixture).

## Tier 2 — Build / Integration

As the application develops, Tier 2 validates:

- clean dependency installation
- build
- database migrations
- API integration
- persistence
- authorization
- tenant isolation
- integration tests
- failure paths

**M0 interpretation:** there is nothing to build yet. Tier 2 for M0
proves that:

- governance scripts execute without error,
- RepoGuard executes,
- RepoGuard fails when intentionally run against a known violation,
- RepoGuard passes on the legitimate, current project state,
- the CI configuration (`feedback-ci.yml`) is syntactically valid,
- the pipeline works from a clean checkout (not just a locally-modified
  working tree).

## Tier 3 — Real Runtime / End-to-End

Once an application runtime exists, Tier 3 must mean real, observed
software behavior — never merely "the build passed". Example future
flow:

start application → create workspace → create/authenticate user →
submit feedback → store data → reload → verify persisted state → vote →
comment → change status → verify permissions → test invalid request →
test cross-tenant access rejection → verify expected UI/API state.

Where appropriate, this uses real browser end-to-end automation.
Security-sensitive functionality always requires negative testing
(what happens when the wrong tenant/user tries it) in addition to
happy-path testing.

**M0 interpretation (bootstrap only):** there is no application runtime
in M0. Tier 3 for M0 means:

- clean checkout reproduction of the whole pipeline,
- execution of the full project validation pipeline end-to-end,
- explicit verification that all changes stayed inside the `feedback/**`
  project boundary (plus the project's own CI workflow file),
- explicit RepoGuard enforcement verification (it genuinely fails on a
  violation, not just prints PASS),
- confirmation that no file outside this project's boundary was
  modified.

This bootstrap definition is a placeholder. **Once real application
runtime exists, Tier 3 must test real behavior as described above — the
bootstrap definition must never again be used as a substitute.**

## CI rule

From day one: **red CI = no merge.** Specifically, never:

- disable a failing test just to obtain green CI,
- weaken a security test,
- remove validation to make a PR pass,
- mark a known failure as `NOT APPLICABLE`,
- merge despite a failing mandatory check.

Fix the underlying issue instead.

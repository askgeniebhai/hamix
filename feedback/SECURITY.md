# Security Baseline

This document establishes **requirements**, not implementation. No
technology stack has been selected yet (see `ARCHITECTURE.md`), so
nothing here should be read as endorsing a specific library, framework,
or provider. Every future milestone that touches these areas must show
how it satisfies the relevant requirement in its validation report.

## Secrets

- Secrets (API keys, credentials, tokens, private keys, connection
  strings) are never committed to the repository, in code, config,
  tests, fixtures, or documentation.
- Secrets are supplied at runtime through environment variables or a
  secret manager appropriate to the eventual deployment target.
- `RepoGuard` scans for accidentally committed secrets and dangerous
  files (`.env`, private keys, credential dumps) on every change.
- If a secret is ever committed, it must be treated as compromised:
  rotate it, then remove it from history per the hosting provider's
  guidance — do not just delete the line in a new commit.

## Dependency review

- New dependencies are reviewed (license, maintenance status, known
  vulnerabilities) before being added.
- Dependency updates that touch security-relevant code are reviewed,
  not auto-merged blindly.

## Authentication & authorization

- Authentication design must resist credential stuffing and brute force
  (rate limiting, safe password handling — hashing with a modern,
  slow, salted algorithm; never reversible encryption or plaintext).
- Authorization checks happen on every request that touches
  tenant-scoped or user-scoped data, server-side, not just hidden in
  the UI.
- Default-deny: an ambiguous or unauthenticated request is rejected,
  not allowed through.

## Tenant isolation

- Once multi-tenant data exists, every data access path must be scoped
  to the requesting tenant/workspace, enforced at the data-access
  layer, and covered by negative tests proving cross-tenant access is
  rejected.

## Input handling

- All external input (user input, API payloads, query parameters,
  uploaded files) is validated and/or sanitized at the boundary.
- Output that renders user-supplied content must be escaped/encoded to
  prevent XSS.
- Database access must use parameterized queries — never string-built
  SQL from external input.

## Session & transport

- Sessions/cookies, where used, are `HttpOnly`, `Secure`, and scoped
  appropriately, with CSRF protection on state-changing requests.
- Production traffic is served over TLS only.

## Rate limiting

- Endpoints that are expensive, security-sensitive (login, password
  reset, invite acceptance), or abusable are rate-limited once they
  exist.

## Auditability

- Sensitive actions (permission changes, billing changes, data
  deletion, admin actions) are logged with enough context to
  reconstruct who did what, when, once such actions exist.

## Configuration & environments

- Production configuration is kept separate from development
  configuration; development defaults must never be usable in
  production (e.g. no default/placeholder secrets accepted at
  production runtime).
- Backups and migrations follow a documented, reversible process once
  a database exists — no undocumented manual schema changes against
  production.

## Current status (M0)

There is no application runtime, no data store, and no authentication
yet, so most of the above are forward-looking requirements rather than
implemented controls. What M0 *does* enforce today: no secrets or
dangerous files are committed (RepoGuard), and this document exists so
every future milestone is held to these requirements from its first
commit rather than retrofitted later.

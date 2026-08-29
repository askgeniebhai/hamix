# Security Baseline

This document establishes **requirements**; see "Current status" below
for what is actually implemented as of the most recent milestone and
where the evidence lives. Every milestone that touches these areas
must show how it satisfies the relevant requirement in its validation
report.

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

## Current status (as of M3)

- **Secrets:** enforced since M0 — RepoGuard's Secret Guard and
  Dangerous File Guard run on every change. `lib/env.ts` fails closed
  (throws) if required secrets are missing/invalid when actually used.
- **Authentication:** implemented — Better Auth email/password, with
  Zod validation on the client and Better Auth's own server-side
  validation behind it. Passwords are hashed by Better Auth (never
  stored or logged in plaintext); real signup/login/logout are covered
  by `e2e/auth.spec.ts` against a real database.
- **Authorization / default-deny:** implemented — protected routes
  (`/dashboard`, `/settings`, `/onboarding`) redirect unauthenticated
  requests to `/login`; `proxy.ts` provides a fast cookie-presence
  check, but the real boundary is the server-side session check in
  `lib/auth/session.ts`, which every protected page calls. Verified by
  `e2e/auth.spec.ts`'s "unauthenticated requests to protected routes
  are rejected" test.
- **Tenant isolation:** implemented for the auth/workspace data that
  exists so far — `requireActiveOrganization()` re-verifies the
  session's active organization against the `member` table rather
  than trusting the session cookie, and Better Auth's own
  `organization/set-active` endpoint rejects switching into an
  organization the caller isn't a member of. Covered by a genuine
  cross-tenant negative test (`e2e/auth.spec.ts`, "tenant isolation")
  against a real Postgres database — not yet exercised against product
  data, since none exists until a future milestone.
- **Session & transport:** implemented — Better Auth's session cookie
  is `HttpOnly`, `SameSite=Lax`, with CSRF protection via Better Auth's
  trusted-origin check on state-changing requests (verified directly:
  a request with a missing/mismatched `Origin` header is rejected).
  `Secure` is applied automatically over HTTPS in production; local
  dev/CI runs over plain HTTP.
- **Rate limiting:** implemented via Better Auth's built-in limiter,
  enabled by default in production; disabled only when `CI=true` so
  the E2E suite's own legitimate rapid signups aren't throttled as
  abuse (`DECISIONS.md` D3-004) — a real deployment keeps it on.
- **Input handling:** implemented for what exists — Zod schemas
  (`lib/validation/auth.ts`) validate signup/login/workspace-creation
  input; Drizzle's parameterized queries are used throughout, no
  string-built SQL anywhere in the codebase.
- **Dependency review:** applied — e.g. the `neon-http` → `node-postgres`
  driver switch and the account-schema patch were each reviewed and
  recorded (`DECISIONS.md` D3-001, D3-002) rather than adopted blindly;
  the drizzle-kit dev-only advisory noted in the M2 report remains a
  documented, accepted risk (no fixed release exists yet).
- **Not yet applicable:** auditability (no sensitive actions beyond
  auth/workspace creation exist yet), backups/migration discipline
  beyond `drizzle-kit`'s own migration files (no production database
  provisioned yet), and XSS-specific review (no user-generated content
  is rendered yet — React's default escaping covers the UI that exists
  today, but this needs explicit re-verification once product content
  like feedback posts/comments exists).

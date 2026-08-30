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

## Current status (as of M8)

- **Secrets:** enforced since M0 — RepoGuard's Secret Guard and
  Dangerous File Guard run on every change. `lib/env.ts` fails closed
  (throws) if required secrets are missing/invalid when actually used.
- **Authentication:** implemented — Better Auth email/password, with
  Zod validation on the client and Better Auth's own server-side
  validation behind it. Passwords are hashed by Better Auth (never
  stored or logged in plaintext); real signup/login/logout are covered
  by `e2e/auth.spec.ts` against a real database.
- **Authorization / default-deny:** implemented — protected routes
  (`/dashboard`, `/settings`, `/onboarding`, `/feedback`) redirect
  unauthenticated requests to `/login`; `proxy.ts` provides a fast
  cookie-presence check, but the real boundary is the server-side
  session check in `lib/auth/session.ts`, which every protected page
  calls. Verified by `e2e/auth.spec.ts`'s "unauthenticated requests to
  protected routes are rejected" test (now including `/feedback`) and
  `e2e/feedback.spec.ts`'s "unauthenticated visitors cannot reach the
  admin feedback view".
- **Tenant isolation:** implemented and now exercised against real
  product data. `requireActiveOrganization()` re-verifies the
  session's active organization against the `member` table rather
  than trusting the session cookie; Better Auth's own
  `organization/set-active` endpoint rejects switching into an
  organization the caller isn't a member of. On the public feedback
  side (M4), `lib/feedback/data.ts` re-verifies a post's
  `organization_id` before recording a vote — a `postId` from another
  organization is rejected even if a request supplies a valid
  participant identity for the org it claims — and `lib/feedback/
  participant.ts` scopes participant identity to (organization, email)
  so the same email produces structurally distinct participant rows
  per organization; no participant, post, or vote can be reused
  across tenants. Comments (M5) share the exact same
  `assertPostInOrganization()` check `castVote()` already used —
  `createExternalComment()`/`createInternalComment()` both call it
  before writing — so a cross-tenant `postId` is rejected the same way
  for a comment as for a vote; `getPostForOrganization()` (the admin
  thread view) returns `null` for a post outside the caller's own
  organization, which the page turns into a 404 rather than ever
  rendering another organization's thread. Covered by genuine
  cross-tenant negative tests in `e2e/auth.spec.ts` ("tenant
  isolation"), `e2e/feedback.spec.ts` ("tenant A's feedback board
  never shows tenant B's posts, and voting cannot cross tenants"), and
  `e2e/comments.spec.ts` ("unauthenticated visitors and non-member
  workspace users cannot reach or affect another organization's admin
  thread") against a real Postgres database.
- **Session & transport:** implemented — Better Auth's session cookie
  is `HttpOnly`, `SameSite=Lax`, with CSRF protection via Better Auth's
  trusted-origin check on state-changing requests (verified directly:
  a request with a missing/mismatched `Origin` header is rejected).
  `Secure` is applied automatically over HTTPS in production; local
  dev/CI runs over plain HTTP. The new public participant-identity
  cookie (`lib/feedback/participant.ts`) follows the same pattern:
  `HttpOnly`, `SameSite=Lax`, `Secure` in production, and carries only
  an opaque token — never the participant's email or a raw database
  id — scoped per organization so it cannot be reused to act as a
  participant of a different organization.
- **Rate limiting:** implemented via Better Auth's built-in limiter,
  enabled by default in production; disabled only when `CI=true` so
  the E2E suite's own legitimate rapid signups aren't throttled as
  abuse (`DECISIONS.md` D3-004) — a real deployment keeps it on. The
  public feedback endpoints (submit/vote) are not yet separately
  rate-limited — see "Known limitations" in the M4 validation report;
  the database-enforced vote-uniqueness constraint prevents the one
  correctness issue unlimited requests could otherwise cause
  (double-voting), but volumetric abuse protection for public
  submission is deferred.
- **Input handling:** implemented for what exists — Zod schemas
  (`lib/validation/auth.ts`, `lib/validation/feedback.ts`) validate
  signup/login/workspace-creation, feedback-submission/participant-
  identity, and now comment-body input server-side (never trusting
  client-side `required`/`minLength`/`maxlength` HTML attributes
  alone — verified directly by `e2e/feedback.spec.ts`'s "invalid
  submission is rejected server-side even if client validation is
  bypassed" and `e2e/comments.spec.ts`'s "invalid, empty, and
  oversized comments are rejected server-side even if client
  validation is bypassed"); Drizzle's parameterized queries are used
  throughout, no string-built SQL anywhere in the codebase.
- **Authorship integrity:** new this milestone — a comment's author
  (external participant vs. internal team member) is never read from
  client-supplied form data; `createExternalComment()` always attaches
  the server-resolved participant identity (cookie or freshly
  identified), and `createInternalComment()` always attaches
  `requireActiveOrganization()`'s own `session.user.id`. The database
  additionally enforces, via a `CHECK` constraint, that a comment row
  can never have both authors or neither (`DECISIONS.md` D5-001),
  proven directly by
  `tests/integration/comment-author-constraint.test.ts` rather than
  assumed from the application code alone. "Non-member cannot use
  internal-author identity" holds by construction:
  `requireActiveOrganization()` resolves the *caller's own*
  organization from their verified session, so there is no code path
  where a workspace member could even reach another organization's
  reply form.
- **Data integrity under concurrency:** the one-vote-per-(post,
  participant) rule is enforced by a database unique index
  (`vote_post_participant_uidx`), not just application logic, and
  proven race-safe by `tests/integration/vote-race.test.ts` (two
  concurrent `castVote` calls against a real database, asserting
  exactly one vote row results) rather than assumed from the
  `onConflictDoNothing()` call alone.
- **Dependency review:** applied — e.g. the `neon-http` → `node-postgres`
  driver switch and the account-schema patch were each reviewed and
  recorded (`DECISIONS.md` D3-001, D3-002) rather than adopted blindly;
  the drizzle-kit dev-only advisory noted in the M2 report remains a
  documented, accepted risk (no fixed release exists yet). M5 added no
  new runtime dependencies (`shadcn`'s Badge primitive is generated
  source, not a new package).
- **Status mutation authorization:** new this milestone —
  `updateStatusAction` requires `requireActiveOrganization()` (an
  unauthenticated request is rejected before any data-layer code
  runs — verified by `e2e/status.spec.ts`'s public-pages negative
  test, which confirms neither public page even renders a
  status-changing control), and `updatePostStatus()` independently
  re-verifies the target post belongs to that organization before
  writing, the same `assertPostInOrganization` pattern every other
  write in `lib/feedback/data.ts` uses — a cross-organization `postId`
  is rejected, proven directly by
  `tests/integration/status-update.test.ts` rather than assumed. An
  invalid status value is rejected twice over: Zod
  (`updateStatusSchema`) at the server-action boundary, and Postgres's
  own enum type underneath it even if application validation were
  bypassed — the same integration test proves the database rejects an
  invalid value written straight through Drizzle, bypassing the
  `PostStatus` type.
- **Data-layer hardening, applied again:** the M6 read-path rewrite
  (vote/comment counts and viewer-vote state moved to per-post scalar
  subqueries — `DECISIONS.md` D6-002) introduced a real correctness
  bug (`DECISIONS.md` D6-003) where a raw `sql` template's unqualified
  column interpolation caused every post to silently read as having
  zero votes and no viewer vote, regardless of actual data. This was a
  correctness defect, not a tenant-isolation break — the buggy
  subqueries still only ever counted the *correct organization's* vote
  rows, they just miscounted them — but it is recorded here because it
  was caught the same way this project treats every other data-layer
  change: full Playwright re-run, not assumed correct from a clean
  typecheck/lint pass, before being considered done.
- **Roadmap tenant isolation and mutation surface:** new this
  milestone — `/b/[slug]/roadmap` introduces no new write path at all;
  it reuses M6's already-hardened `updatePostStatus()` as the sole way
  a post's roadmap placement changes. Reads are scoped by `boardId`,
  the same pattern `listBoardPosts()` already uses (the board itself
  was already resolved from a legitimate slug lookup, so no separate
  organization check is needed for a read). Proven directly, not
  assumed: `tests/integration/roadmap.test.ts` shows a second board's
  posts are absent from the first board's roadmap query, and
  `e2e/roadmap.spec.ts` shows the public roadmap page renders no
  status-changing control at all (no `combobox`, no button matching
  "Change status") for an unauthenticated visitor.
- **Changelog authorization, tenant isolation, and consent:** new this
  milestone — creating, editing, linking, and publishing a changelog
  entry all require `requireActiveOrganization()` at the action layer,
  and `lib/changelog/data.ts` independently re-verifies every id it's
  handed (entry, post, author) belongs to that same organization
  before writing, the same pattern every other write in this codebase
  uses. A post can only be linked while `complete` and in the same
  organization — enforced at the write, not just the picker UI — and
  publishing re-verifies every linked post is *still* `complete`
  before proceeding. A draft is never returned by the public query
  (`listPublishedChangelogEntries`'s `WHERE state = 'published'` is
  the only filter, proven directly by a test asserting absence before
  publish and presence after, for the same entry). Consent for email
  is never inferred: `post_subscription` rows are created by exactly
  one path — an explicit "Follow updates" click — never by
  submitting, voting, or commenting; unsubscribing works both from a
  cookie-identified session and from a single-purpose per-subscription
  token reachable with no session, so a leaked unsubscribe link's
  blast radius is limited to removing that one subscription.
- **Delivery integrity:** publishing is idempotent by construction — a
  `state = 'draft'`-guarded atomic `UPDATE` plus a unique constraint
  on `(changelog_entry_id, participant_id)`, both inside one
  transaction with the recipient-row creation — so a double publish,
  a retry, or a page refresh cannot produce a duplicate notification;
  proven directly, not assumed, including the case where one
  participant follows two of an entry's linked posts (must receive
  exactly one notification, not two). The admin changelog view exposes
  only aggregate delivery counts (notified/failed/pending) — a
  recipient's email is never returned by any read path reachable from
  the UI, proven directly by asserting the detail response contains no
  email-shaped string.
- **Concurrency hardening (PR #31 review response):** an edit, a link/
  unlink, and a publish on the same changelog entry now serialize
  against each other via `SELECT ... FOR UPDATE` on the entry row
  (`lockEntryForUpdate` in `lib/changelog/data.ts`) — closing three
  TOCTOU windows where a concurrent operation could observe a state
  the other had already invalidated (an edit landing on content
  already published; a link attaching to an entry mid-publish, so its
  subscribers were omitted from the notification already sent; a
  linked post's `complete` status flipping between publish's own
  revalidation check and its commit). Proven directly, not assumed: a
  test holds a manual row lock open and shows a concurrent
  `updateChangelogDraft` call genuinely blocks until it's released —
  this fails against the pre-fix code, which took no lock at all.
  `retryChangelogNotifications()` closes the one remaining delivery
  gap the transaction boundary itself can't cover — a send loop
  interrupted mid-flight after the publish transaction already
  committed — by resuming exactly the `pending`/`failed` rows left
  over, gated behind the same organization/entry-ownership check every
  other changelog write uses.
- **Unsubscribe is confirm-then-POST:** `unsubscribeByToken()` (the
  deleting function) is reachable only from an explicit form submit
  (`confirmUnsubscribeAction`); the `/unsubscribe/[token]` page's GET
  render calls only a read-only `previewUnsubscribeByToken()` and
  shows a confirmation. A security scanner or client prefetching an
  email's unsubscribe link can no longer silently remove the real
  recipient's subscription before they've opened the email — the
  single-purpose-token design from M8 (`DECISIONS.md` D8-007) is
  unchanged; only the GET-must-not-mutate boundary was fixed.
- **Email transport:** production email goes through the official
  `resend` SDK behind an `EmailTransport` interface, never a hand-
  rolled HTTP call; every test uses a deterministic fake transport, so
  no test in this suite makes a real network call to a third-party
  email provider. `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` are optional —
  a zero-env build and an unconfigured workspace never crash — and an
  actual publish attempt with email unconfigured still succeeds for
  the changelog content while every notification is recorded `failed`
  with a truthful reason, never silently dropped or falsely reported
  `sent`.
- **Not yet applicable:** auditability (no sensitive actions beyond
  auth/workspace creation, feedback submission/voting/commenting/
  status changes, and now changelog publishing exist yet — the
  `changelog_notification` delivery record is itself a lightweight
  audit trail for publish/notify, but nothing else in the product
  needs one yet), backups/migration discipline beyond `drizzle-kit`'s
  own migration files (no production database provisioned yet).
  XSS-specific review remains partially applicable: feedback post
  titles/descriptions, comment bodies, and now changelog titles/bodies
  are user-generated content, rendered as plain text through React's
  default escaping (never `dangerouslySetInnerHTML`) in the app itself,
  and explicitly HTML-escaped in the notification email template
  (`lib/email/templates.ts`, proven directly by a test asserting a
  `<script>` tag in a title is never emitted unescaped) — no rich text
  or HTML rendering exists to review yet.

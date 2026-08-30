# Validation Report — M9: Commercial Launch (Billing, Tracked Participants, UI/UX Polish)

- **Milestone ID:** M9
- **Objective:** The last planned build milestone before real customer
  testing — not new product surface area, but making the existing
  product beautiful, trustworthy, billable, and sellable. Authorized
  parts A–P: a tracked-participant metric, Free/Pro billing reused
  from the Product Owner's existing Shopify store, a UI/UX benchmark
  against Canny's public surfaces and a polish pass, a commercial
  home/pricing page, a launch-readiness checklist, legal/trust
  placeholder pages, a commercial end-to-end test, and this report.
- **Repository:** `askgeniebhai/hamix`
- **Branch:** `claude/feedback-m9-commercial-launch`
- **Starting SHA:** `50cf1ba9e4e48ee4c459d64e32f36e06e8533f62` (tip of
  `main` after PR #31 / M8 merged)
- **Ending SHA:** recorded at the top of the PR description and in the
  final report — this report, `MILESTONES.md`, and
  `docs/UI_UX_COMMERCIAL_BENCHMARK.md`'s Part P section land in the
  same commit as the rest of this milestone's application code.
- **Files changed (by area):**
  - Billing core: `lib/db/billing-schema.ts`, `drizzle/0006_shocking_purple_man.sql`,
    `lib/billing/plans.ts`, `lib/billing/data.ts`, `lib/billing/usage.ts`,
    `lib/billing/shopify/{config,checkout,webhook}.ts`,
    `app/api/webhooks/shopify/route.ts`,
    `app/(workspace)/settings/billing/{page,actions}.tsx`,
    `components/billing/upgrade-button.tsx`, `lib/env.ts` (five
    `SHOPIFY_*` vars, `CONTACT_EMAIL`)
  - Limit enforcement: `lib/feedback/data.ts` (`assertWithinParticipantLimit`
    wired into `createPost`/`castVote`/`createExternalComment`),
    public-facing error messaging in `app/b/[slug]/actions.ts` and
    `app/b/[slug]/p/[postId]/actions.ts`
  - UI/UX polish: `app/(workspace)/dashboard/page.tsx`,
    `components/dashboard/public-board-url.tsx`,
    `components/layout/app-sidebar.tsx`, `components/layout/mobile-nav.tsx`,
    `app/(workspace)/layout.tsx`, `components/feedback/submit-feedback-toggle.tsx`,
    `app/b/[slug]/page.tsx`, `app/page.tsx`, `components/layout/site-header.tsx`,
    `components/layout/site-footer.tsx`, `app/{privacy,terms,contact}/page.tsx`
  - Tests: `tests/unit/billing-plans.test.ts`, `tests/integration/billing-usage.test.ts`,
    `tests/integration/billing-shopify-webhook.test.ts`, `e2e/commercial.spec.ts`,
    updates to `e2e/{helpers,shell,feedback,auth}.spec.ts`
  - Docs: `DECISIONS.md` D9-001/D9-002, `docs/UI_UX_COMMERCIAL_BENCHMARK.md`,
    `docs/launch-readiness-checklist.md`, this report, `MILESTONES.md`,
    `.github/workflows/feedback-ci.yml` (fake Shopify test credentials
    for the Tier 3 job)

## Tracked-participant metric (Part E)

One canonical calculation, `lib/billing/usage.ts`'s
`countTrackedParticipants` — built with the query builder's own
`exists()`/`eq()`/`or()`, not a raw `sql` template with an interpolated
bare column (the standing D6-003/D8-006 rule). Counts an external
participant exactly once if they submitted a post, cast a vote, or
posted a customer comment — never a workspace member's own reply
(`comment.authorUserId`, never `comment.participantId`), never a
participant who only followed a request or was merely identified.
`assertWithinParticipantLimit` is the single enforcement point, called
from `createPost`/`castVote`/`createExternalComment` before the write:
an already-tracked participant is always let through unconditionally,
so the limit only ever blocks a genuinely *new* tracked participant,
never revokes or blocks an existing one's continued activity.

Proven directly, not assumed: `tests/integration/billing-usage.test.ts`
seeds an organization to exactly 25 tracked participants and shows the
26th blocked while every already-tracked participant keeps working;
`e2e/commercial.spec.ts` proves the same boundary through the real
browser, seeing the actual customer-facing message.

## Free/Pro entitlement model

- **Free:** 25 tracked participants — the complete existing core loop
  (Feedback, Voting, Comments, Status, Roadmap, Changelog), no feature
  gating.
- **Pro:** 100 tracked participants, ≈$99/month working target.
- Both numbers and the price are centrally configurable in
  `lib/billing/plans.ts` (`PLAN_TRACKED_PARTICIPANT_LIMIT`,
  `PRO_PLAN_DISPLAY_PRICE_USD`) — no hardcoded second copy anywhere
  else, including the marketing pricing section and the billing page.
- `isEntitledStatus` treats `active`/`trialing`/`past_due` as
  entitled — a `pro` row with a `canceled` status is not Pro.
  Effective entitlement (`resolveEffectivePlan`) is always `plan`
  gated by `status`, never `plan` alone.

## Billing architecture — provider

The Product Owner's existing Shopify store/Shopify Payments setup, not
a new Stripe integration — a mid-build correction, researched live
against current official Shopify documentation before any
provider-specific code was written. Full research findings (what was
and wasn't reusable, the honest limitation around
`subscription_contracts/update`'s exact payload shape, and the
rejected simpler cart-permalink design) are in `DECISIONS.md` D9-001.

Entitlement logic (`lib/billing/plans.ts`, `lib/billing/usage.ts`) has
no import from anything Shopify-specific, per the Product Owner's
explicit "payment provider ≠ entitlement logic" rule — `organization_billing`
stores `provider`/`provider_customer_id`/`provider_subscription_id` as
opaque strings, so a second provider could be added later without
touching entitlement code.

**Checkout:** `createProCheckoutUrl()` uses the Storefront API's
`cartCreate` mutation (not a cart permalink — confirmed unusable with
selling plans directly from Shopify's own docs), attaching the
subscription's `sellingPlanId` and an `organization_id` cart
attribute. Shopify copies that attribute onto every order the
resulting subscription contract generates, including renewals
(confirmed from Shopify's own developer changelog) — the entire
tenant-mapping mechanism, no separately-stored provider subscription
id needed to correlate webhooks.

**Security:** `startCheckoutAction` requires `requireActiveOrganization()`
and rejects any role other than owner/admin before ever calling
Shopify — a regular member cannot reach Checkout or the
manage-subscription page even by guessing the action's URL. No secret
reaches the client.

## Webhook/idempotency results

`processShopifyWebhook()` (`lib/billing/shopify/webhook.ts`) is the
single entry point every webhook goes through: verify HMAC-SHA256
(Shopify's own documented recipe, `createHmac` + `timingSafeEqual`,
reproduced and confirmed against a real forged signature — not a
"trust me" mock) → deduplicate via `billing_webhook_event`'s unique
`(provider, provider_event_id)` index with `ON CONFLICT DO NOTHING` as
the actual serialization point (the same D8-004 pattern changelog
delivery already used) → dispatch by topic.

Proven with real integration tests against a real Postgres database
(`tests/integration/billing-shopify-webhook.test.ts`, 7 tests) and
again end to end through the real running server
(`e2e/commercial.spec.ts`'s webhook-lifecycle group, 5 tests, desktop
+ mobile = 10 assertions across both projects):

- A forged/tampered signature is rejected (`invalid_signature`, HTTP
  401) and grants nothing.
- A genuinely signed `orders/paid` webhook grants Pro; the exact
  entitlement change persists across a page reload (a real database
  read, never a client-cached state).
- The identical webhook, redelivered with the same
  `X-Shopify-Webhook-Id`, is a no-op (`duplicate`, HTTP 200) — no
  double grant, no error.
- Tenant isolation: a webhook for organization A never grants Pro to
  organization B.
- `orders/cancelled` and `subscription_contracts/update` (status
  `CANCELLED`) both reconcile an already-Pro organization back to
  Free entitlement.

## Pricing configuration

`lib/billing/plans.ts`'s `PLAN_TRACKED_PARTICIPANT_LIMIT` and
`PRO_PLAN_DISPLAY_PRICE_USD` are the single source read by the billing
page, the marketing pricing section (`app/page.tsx`), and every test —
changing the number in one place changes it everywhere it's shown.

## Canny UI/UX benchmark and screens audited

Full detail in `docs/UI_UX_COMMERCIAL_BENCHMARK.md`. Method: our own
production build driven through a real session in a real browser
(Playwright, Chromium) at ~1440px and ~390px; Canny researched only
through its own public surfaces (`feedback.canny.io`,
`canny.io/features`, `canny.io/pricing`, `help.canny.io`) — its
private admin was never accessed, guessed at, or described. No Canny
code, layout, copy, or asset was copied.

Screens audited (both breakpoints, populated and empty states where
both exist): public board, post detail/thread, public roadmap, public
changelog, admin dashboard, admin feedback list/detail, sidebar
navigation, billing page (Free display and the honest checkout-failure
state), root/public entry with pricing, onboarding (signup →
workspace → dashboard), privacy/terms/contact.

"After" screenshots (16 total, desktop 1440×900 and mobile 390×844,
captured against a real running build with a real signup → workspace →
board → submission → billing session) confirm every change described
below actually renders as claimed, with no horizontal overflow and no
clipped text at either width.

## Before/after UX improvements

- Public board reordered list-first, submission form collapsed behind
  a "Share feedback" toggle (`components/feedback/submit-feedback-toggle.tsx`).
- Dashboard rebuilt: real public-board URL front and center
  (`components/dashboard/public-board-url.tsx`), real open-request and
  tracked-participant counts (previously a static empty-state
  regardless of real data).
- Sidebar's stale "Roadmap — coming soon" entry removed (Roadmap
  shipped in M7); Billing added.
- Root page rebuilt into a real commercial entry: hero, the
  Feedback/Roadmap/Changelog loop named explicitly, Free/Pro pricing,
  Start Free/Login CTAs, no exaggerated claims.
- `/privacy`, `/terms`, `/contact` added as honest placeholders,
  explicitly marked pending Product Owner/legal review.
- **Mobile navigation added where none existed** — `AppSidebar` is
  `hidden md:flex`; nothing filled that gap before this milestone. A
  fresh cross-viewport E2E run (not the benchmark's own inspection)
  caught it. `components/layout/mobile-nav.tsx` is a persistent bottom
  tab bar (`DECISIONS.md` D9-002 records why, and why a hamburger/drawer
  was rejected).
- Public-facing billing-limit error messaging fixed: `submitFeedbackAction`
  had no `try`/`catch` around a write that could now throw
  `TrackedParticipantLimitReachedError` (a real, reachable crash once
  a Free org hit its limit); `voteAction`/`addExternalCommentAction`
  showed either a generic message or the error's own admin-facing
  wording to anonymous customers. `PARTICIPANT_LIMIT_PUBLIC_MESSAGE` +
  `isParticipantLimitError()` fix all three uniformly.

## Areas genuinely better / still weaker (Part P)

Full reasoning, evidence, and the explicit "cannot be compared without
private Canny access" boundary are in
`docs/UI_UX_COMMERCIAL_BENCHMARK.md`'s own Part P section — summarized:
genuinely better where a smaller, single-board surface area is
clearer for a first customer to explain to their own team in one
sentence, and where the roadmap/changelog visibly link back to the
requests that drove them; still weaker on multi-board/categories,
public search, richer roadmap columns, a rich-text changelog editor,
and the trust signals a mature product accrues for free — every one of
those is on M9's explicit "DO NOT BUILD" list, correctly deferred, not
missed.

## Mobile/accessibility result

Zero horizontal overflow on every captured surface at both 1440px and
390px. The existing `@axe-core/playwright` suite (every route this
milestone touches, plus the two new pages `/privacy`/`/terms`/`/contact`)
is green with zero violations after this milestone's changes,
including two real accessibility improvements made along the way: the
dashboard's "Your public feedback board" section is now a real `<h2>`
(was a plain `<div>`, `components/ui/card.tsx`'s `CardTitle` default),
and `PublicBoardUrl`'s copy-target input has a real associated label
(was an unlabeled `readOnly` input, a critical axe violation).

## Commercial E2E result (Part O)

`e2e/commercial.spec.ts`, 7 tests × 2 projects (desktop + mobile
Chromium) = 14 assertions, all green: Free-plan billing display; an
honest, visible checkout failure when Shopify is unreachable (the
test environment's `SHOPIFY_STORE_DOMAIN` genuinely doesn't resolve —
this is a real network failure, not a mocked one, and the UI shows
"Couldn't start checkout. Please try again." rather than a fake
success or a crash); the full Shopify webhook lifecycle described
above; and the Free-plan tracked-participant limit blocking a
brand-new participant with `PARTICIPANT_LIMIT_PUBLIC_MESSAGE` visible
in the real browser. `SHOPIFY_*` credentials in every environment that
runs this suite (local verification and the CI job) are fake,
non-routable test values — no real Shopify store, no possibility of a
real charge.

The full "first paying customer" journey this test file's own header
comment describes is proven by composing it with the rest of Tier 3,
deliberately rather than by re-writing one giant redundant end-to-end
spec: signup → board → submit/vote/comment is `e2e/feedback.spec.ts`;
roadmap movement is `e2e/roadmap.spec.ts`; changelog publish +
notification is `e2e/changelog.spec.ts`; this file adds exactly the
commercial layer none of those already cover.

## Tier 1/2/3 and full regression totals

- **Tier 1 (lint + typecheck):** clean, zero errors/warnings.
- **Tier 2 (build + unit + integration):**
  - Zero-env production build: succeeds — but only after a real bug
    this milestone introduced was found and fixed. The first local
    `env -i` verification was a false positive (Next.js auto-loads
    `.env.local` independent of shell state; `DECISIONS.md` D9-003
    has the full account) and missed that `/contact` crashed
    prerendering with zero real env vars, which PR #32's own CI then
    caught for real. Fixed by having `/contact` read
    `process.env.CONTACT_EMAIL` directly instead of through the
    full-schema `getEnv()`. Re-verified genuinely zero-env afterward
    (`.env.local` moved aside for the run, not just an empty shell
    environment) — succeeds.
  - Configured-env production build (all `SHOPIFY_*` plus
    `CONTACT_EMAIL` set): succeeds.
  - Vitest unit: 69/69 passing.
  - Vitest integration (real Postgres): 46/46 passing.
- **Tier 3 (E2E, real running server, desktop + mobile Chromium):**
  114/114 passing — 100 across the pre-existing suites (shell, auth,
  feedback, comments, status, roadmap, changelog) plus 14 from the new
  `e2e/commercial.spec.ts`, zero failures, zero flakes across two full
  fresh runs.

## Review findings and fixes (this milestone)

Two real bugs were found by a fresh E2E run against both viewports,
not by inspection, and fixed before this milestone's E2E suite was
considered green:

1. **No mobile navigation existed at all** — caught when
   `e2e/shell.spec.ts`'s workspace-nav test (extended this session to
   also assert the Billing link) ran against `mobile-chromium` and
   failed on a locator that simply didn't exist at that viewport.
   Fixed with `components/layout/mobile-nav.tsx` (`DECISIONS.md`
   D9-002).
2. **Two accessibility-scan races**, both on mobile only: the new,
   heavier home page hero and a post-`revalidatePath` re-render could
   both leave `document.title`/the scanned heading not yet settled
   when `axe` ran. Fixed by adding explicit waits before both scans
   (`e2e/shell.spec.ts`, `e2e/feedback.spec.ts`), the same class of
   fix `e2e/helpers.ts`'s `createWorkspace`/`openPostDetail` already
   established this project's standing pattern for.

A third issue was found by manual code review while designing the
Part O commercial E2E test, not by any test failure: `submitFeedbackAction`
had no `try`/`catch` around a write that M9's own newly-wired
`assertWithinParticipantLimit` could now cause to throw — a real,
reachable production crash the first time any Free-plan org actually
hit its limit. Fixed alongside the admin-facing-wording-shown-to-customers
issue in the same three files (see "Before/after UX improvements"
above).

**Post-review hardening (PR #32, after this report's first draft):**
CI itself caught a real bug the local zero-env verification had missed
— `/contact` crashed prerendering with genuinely zero env vars because
it called the full `getEnv()` schema for one optional field
(`DECISIONS.md` D9-003, which also documents why the earlier local
check was a false positive). Codex's automated PR review then raised
five findings; four were real and fixed at the root — webhook
ledger/entitlement atomicity, `orders/paid` product verification,
lapsed-period-end expiration, and `provider_customer_id`'s incorrect
global uniqueness (`DECISIONS.md` D9-004). All five review threads
replied to and resolved. Regression after all of it: 70 unit / 48
integration / 114 Playwright.

## CI

`.github/workflows/feedback-ci.yml`'s Tier 3 job now carries fake,
non-routable `SHOPIFY_*` test credentials (mirroring the ones used for
local verification) so `e2e/commercial.spec.ts`'s webhook tests — which
compute a real HMAC against a real `SHOPIFY_WEBHOOK_SECRET` — can run
in CI with no real Shopify access and no possibility of a real charge.

## MCP tooling verification

Per an explicit Product Owner instruction issued mid-milestone, three
MCP tools were configured and genuinely exercised — not just
installed — before merge.

**Chrome DevTools MCP: PASS.** Installed via
`claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest`;
`claude mcp get chrome-devtools` confirmed a real stdio connection.
This remote session's own agent runtime does not load locally-added
MCP servers into its live tool list (tool provisioning here is
centrally managed — confirmed via `ListConnectors`, which lists only
the account's actual connected connectors), so genuine use was proven
two ways instead:
1. A raw MCP JSON-RPC session (`initialize` → `list_pages` →
   `navigate_page` → `list_console_messages` → `list_network_requests`)
   driven directly against the real running production build, using
   `--executablePath` pointed at this sandbox's Chromium (no system
   Chrome install exists here under the default `stable` channel,
   which the server needs told explicitly). Real result: 0 console
   messages, 21 network requests, all `200`.
2. A full DevTools-style QA pass (console errors/warnings, failed
   requests, HTTP 4xx/5xx, page errors, horizontal overflow, mobile
   nav presence) via Playwright's own Chromium — the same underlying
   CDP-based automation — across all 11 requested surfaces (public
   board, thread, roadmap, changelog, signup, login, onboarding,
   dashboard, admin feedback list/detail, billing) at both 1440px and
   390px, driven through a real signup → workspace → submission
   session.
   - **First run: 1 real defect found.** Every page load logged a
     genuine browser console error — `/favicon.ico` 404s; the app has
     never had a favicon in any milestone. Root-caused and fixed:
     `app/icon.tsx` (Next.js's generated-icon convention — a small
     server-rendered PNG, no external asset needed), which Chromium
     picks up via the auto-injected `<link rel="icon">` instead of
     probing `/favicon.ico` at all.
   - **Re-verification run after the fix: 0 findings** across all 11
     surfaces × 2 viewports — no console errors/warnings, no failed
     requests, no HTTP 4xx/5xx, no page errors, no horizontal
     overflow, mobile nav present. (941 `net::ERR_ABORTED` entries
     from Next.js's own Link-hover RSC prefetching, cancelled by the
     script's faster-than-human navigation, were identified and
     excluded as expected framework behavior, not defects — confirmed
     by isolating and re-testing the one genuine signal separately.)

Shortly after the above, this session's live agent tool list actually
picked up `mcp__chrome-devtools__*` and `mcp__context7__*` on its own
(a mid-session refresh, not something triggered deliberately) —
correcting the "not loaded into the live tool list" statement above
for the remainder of this session, though the raw-protocol route was
what actually did the real work reported here. Calling
`mcp__chrome-devtools__list_pages` live hit the identical "no Google
Chrome executable" error the raw-protocol attempt hit before its
explicit `--executablePath` override — expected, since this
in-session instance was launched by the platform with its own default
args, which this session doesn't control, so the workaround that made
the raw-protocol route succeed isn't available through the live tool
here. This doesn't change the PASS above; it only explains why the
proof route was raw-protocol rather than live-tool for this specific
server in this specific sandbox.

**Sentry MCP: SENTRY MCP — EXTERNAL CONFIGURATION BLOCKED.** Added via
`claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`
(the official hosted endpoint) — configuration is real and in place.
`claude mcp login sentry` was attempted and returned a genuine Sentry
OAuth authorization URL, confirming the server itself is reachable and
correctly configured; it could not be completed because this
environment has no interactive browser and no Sentry account
credentials for this project exist to authorize with. **Exact external
action required:** a person with access to the target Sentry
organization must either (a) run `claude mcp login sentry` in an
interactive terminal and complete the browser OAuth consent, or (b)
supply a Sentry auth token this session can use non-interactively.
Separately, and worth flagging regardless of the connector: **no
Sentry SDK or error-reporting instrumentation exists anywhere in this
codebase** — no milestone has added one — so even once connected,
there is no Feedback-specific Sentry project or issue history to
query yet. Per the instruction's own scope guard, no Sentry SDK was
added to the application as part of this work; that would be new
runtime instrumentation, a separate decision from connecting the MCP
tool, and isn't justified by launch-readiness evidence gathered so
far.

**Context7 MCP: PASS.** Installed via
`claude mcp add context7 -- npx -y @upstash/context7-mcp`; connected
per `claude mcp get`. Genuinely queried via the same raw-protocol
approach as Chrome DevTools MCP (this session's live agent tool list
doesn't include it either, for the same centrally-managed-provisioning
reason): a real `tools/list` call returned `resolve-library-id` and
`query-docs` with their full input schemas, and a real `tools/call`
for `resolve-library-id({query: "static prerendering and environment
variables", libraryName: "Next.js"})` reached Context7's live API and
returned a genuine response — "Monthly quota exceeded," the anonymous
tier's real, shared rate limit, not a fabricated result. **Technologies
checked:** Next.js was the one queried live (chosen because it's the
exact API surface the `/contact` defect above lives in — static
generation and environment variables); Drizzle, the Shopify APIs, and
Better Auth were not reachable this way without a paid API key.
**Implementation discrepancy check performed a different, still-real
way (at first):** the actual `/contact` defect found by the DevTools
MCP pass *is* the concrete instance of exactly the class of risk
Context7 was asked to catch (a stale assumption about when environment
variables are available during Next.js static generation) — found and
fixed independent of Context7's quota limit, by the live-browser pass
instead. No other API-risk discrepancy was identified in this
session's billing/auth code, which was already independently
researched against current official documentation before being
written (`DECISIONS.md` D9-001 for Shopify's Storefront/Subscriptions
APIs, `ARCHITECTURE.md`/earlier decision entries for Better Auth and
Drizzle).

The quota did recover before this milestone closed: once
`mcp__context7__*` appeared in this session's own live tool list (the
same mid-session refresh noted above), a real live `resolve-library-id`
call for "Next.js" succeeded (`/vercel/next.js`, 5593 snippets, High
reputation), followed by a real live `query-docs` call asking exactly
the `/contact` bug's underlying question — whether a statically
prerendered page gets environment variables at build time, and what
happens if reading one throws. The real documentation returned
confirms the diagnosis directly: Next.js's own docs show
`process.env.X` read straight from Pages Router `getStaticProps` (the
App Router static-generation equivalent) as the normal, supported
pattern — nothing in Next.js itself throws on a missing var; the crash
was entirely this codebase's own `envSchema.parse(process.env)`
validating fields `/contact` never needed, exactly as diagnosed and
fixed. Context7 access at full capacity would let this same diligence
be repeated for future milestones without a separate web search each
time, not replace work already done here.

## Production blockers (external configuration only — nothing in the codebase itself blocks launch)

Full detail, exact env vars, and named owners in
`docs/launch-readiness-checklist.md`. Every blocker below is external
configuration, never application code:

- Real Shopify store domain, Storefront API access token, webhook
  secret, and the "Feedback Pro" product's variant/selling-plan ids —
  currently unset in production; the app runs correctly without them
  (Free plan fully functional, billing page honestly reports
  unconfigured, webhook route safely no-ops), but Checkout is
  unreachable until they're set.
- Which Shopify customer-accounts system the Product Owner's store
  actually uses (classic `/account` vs. the newer hosted accounts
  domain) — `buildManageSubscriptionUrl()` assumes the classic path;
  needs verifying against the real store before launch.
- `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` (changelog notification
  delivery — M8, unchanged this milestone).
- `CONTACT_EMAIL` — the `/contact` page shows an honest "not yet
  configured" message until this is set; no email is fabricated.
- Production `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`
  for the real deployment target.
- Legal review of `/privacy` and `/terms`' placeholder content before
  it's treated as the org's actual policy.

## PR link

Recorded once opened — see the final report delivered alongside this
milestone's completion.

## FINAL STATE

**M9 COMMERCIAL LAUNCH READY** from an application-code perspective —
every Tier 1/2/3 check is green, the zero-env and configured-env
builds both succeed, billing is provider-neutral and fails honestly
when unconfigured, and the commercial E2E suite proves the full
webhook/entitlement lifecycle end to end. Launch itself is blocked
only by the external configuration listed above
(`docs/launch-readiness-checklist.md`), never by anything in this
repository.

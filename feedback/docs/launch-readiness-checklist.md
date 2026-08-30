# Launch Readiness Checklist

M9 Part L. Reviewed against the actual state of this codebase and this
environment as of this milestone — nothing below is simulated or
assumed working; every ✅ has a validation source cited, and every ⛔
names the exact blocker and who needs to act on it.

## Environment variables

| Variable | Status | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ Required, validated | Must point at the production Postgres instance before deploy. |
| `BETTER_AUTH_SECRET` | ✅ Required, validated | Generate a fresh production value (`openssl rand -base64 32`) — never reuse the local-dev or CI value. |
| `BETTER_AUTH_URL` | ✅ Required, validated | Must be the canonical production origin (also used to build every public/email link this app generates). |
| `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` | ⛔ Not configured here | Optional/zero-env-safe by design (`DECISIONS.md` D8-005) — the app runs correctly without them, but changelog-publish notifications will record every delivery `failed` until both are set. **Owner: Product Owner** (Resend account + verified sending domain). |
| `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_STOREFRONT_ACCESS_TOKEN` / `SHOPIFY_WEBHOOK_SECRET` / `SHOPIFY_PRO_VARIANT_ID` / `SHOPIFY_PRO_SELLING_PLAN_ID` | ⛔ Not configured here | Optional/zero-env-safe (`DECISIONS.md` D9-001) — the app runs and the Free plan works fully without them; Checkout and webhook processing fail with an honest message until they're set. **Owner: Product Owner** — requires creating a "Nudge Pro" subscription product + selling plan in the Shopify store admin, and a custom app for the Storefront API token. See "Shopify billing setup" below. |
| `CONTACT_EMAIL` | ⛔ Not configured here | Optional — `/contact` shows an honest "not configured" message rather than a fabricated address until set. **Owner: Product Owner.** |

## Shopify billing setup (Part H/L — this session cannot do this)

No Shopify store, API credentials, or admin access exist in this
environment — the same class of blocker a Stripe integration would
have had. Before Pro can be sold for real:

1. In the Shopify store admin, create a "Nudge Pro" product with a
   monthly Selling Plan (subscription) priced at the intended public
   rate (`lib/billing/plans.ts`'s `PRO_PLAN_DISPLAY_PRICE_USD` should
   be updated to match exactly).
2. Create a custom app in the store admin, grant it a **Storefront
   API** access token (not an Admin API token — Checkout creation in
   this codebase only needs Storefront API scope).
3. Configure a webhook subscription (Admin → Notifications → Webhooks,
   or the Admin GraphQL API) for at least `orders/paid` and
   `orders/cancelled`, pointed at
   `https://<production-domain>/api/webhooks/shopify`, and note the
   webhook signing secret.
4. Set the five `SHOPIFY_*` environment variables above from what
   steps 1–3 produced.
5. **Before relying on it for real customers**, send one real test
   subscription through the live store (Shopify's own test/sandbox
   payment methods where available) and confirm: the Checkout redirect
   works, `orders/paid` correctly flips the organization to Pro, and
   cancelling flips it back — this session's tests prove the code is
   correct against Shopify's *documented* webhook behavior, but do not
   and cannot prove it against this *specific* store's live
   configuration (`DECISIONS.md` D9-001's own honest limitation note,
   particularly around `subscription_contracts/update`'s exact payload
   shape).
6. If the store uses Shopify's newer hosted "New Customer Accounts"
   rather than classic accounts, update
   `lib/billing/shopify/checkout.ts`'s `buildManageSubscriptionUrl()`
   to point at that domain instead of `/account`.

## Migrations & database

- ✅ All migrations (`drizzle/0000`–`0006`) apply cleanly to a fresh
  Postgres 16 database — verified directly against both a local dev
  instance and the CI database this session, not assumed.
- ⛔ No production database has been provisioned or migrated yet.
  **Owner: Product Owner/deploy step** — run `npx drizzle-kit migrate`
  (or the deploy pipeline's equivalent) against the real production
  connection string before first traffic.
- Backups/point-in-time recovery: dependent on whatever managed
  Postgres provider is chosen for production (e.g. Neon) — not
  something this codebase configures; confirm the provider's default
  backup retention meets the business's actual requirement before
  launch.

## Build, tests, and CI

- ✅ `npm run lint` — 0 errors.
- ✅ `npm run typecheck` (`tsc --noEmit`) — 0 errors.
- ✅ `npm run build` — clean with **zero** environment variables set,
  including no Shopify/email credentials (proven directly, this
  session).
- ✅ Unit suite (`npm run test`) — 65/65 passing, zero-env.
- ✅ Integration suite (`npm run test:integration`, real Postgres) —
  full count and pass rate in `validation/reports/M9-validation-report.md`.
- ✅ Full Playwright regression (`desktop-chromium` + `mobile-chromium`,
  `CI=true`, `--retries=0`) — result in the M9 validation report;
  re-run against this milestone's own UI changes, not assumed still
  passing from M8.
- ✅ RepoGuard + its self-test — pass (scope, boundary, conflict,
  secret, dangerous-file, git-hygiene, governance guards).

## Production configuration

- ⛔ No production hosting/deployment target is configured in this
  repository (no Vercel project, no Dockerfile beyond what's already
  here if any, no CI/CD deploy step observed). **Owner: Product
  Owner** — choose and configure a host, point its `DATABASE_URL`/
  `BETTER_AUTH_URL`/secrets at production values.
- ⛔ No custom domain/DNS — `BETTER_AUTH_URL` and every public link
  this app generates (board URLs, changelog links, unsubscribe links,
  email content) depend on the correct production origin being set.
- Security headers, rate limiting, and CSRF protection: inherited
  from Better Auth's own defaults and whatever the hosting platform
  provides — not independently hardened or audited in this milestone;
  out of scope per "no speculative infrastructure work" (M9 Part N).

## Accessibility & responsive

- ✅ `@axe-core/playwright` automated WCAG 2.1 A/AA checks pass on
  every route this milestone touches (existing suite, re-run clean
  this session).
- ✅ Zero horizontal overflow at ~1440px and ~390px on every captured
  surface (`docs/UI_UX_COMMERCIAL_BENCHMARK.md`'s screenshot set,
  `overflow-report.json`).
- ⛔ No manual assistive-technology (real screen reader) pass has been
  done — automated checks only. **Owner: whoever does the pre-launch
  QA pass**, if the business wants that assurance before real
  customers rely on it.

## SEO / indexability

- Not specifically addressed this milestone — no `robots.txt`,
  `sitemap.xml`, canonical/Open Graph metadata beyond Next.js's
  per-route `<title>` were found or added. Deferred per revenue
  discipline (doesn't block the first 20–25 sales, which come from
  direct outreach, not organic search, at this stage) — flagged here
  so it isn't forgotten before a public launch that *does* depend on
  search traffic.

## Legal / trust surfaces

- ✅ `/privacy`, `/terms`, `/contact` exist and are linked from the
  site footer (Part M) — factual, honest, explicitly marked as
  placeholders pending real legal review. No company registration,
  address, or binding legal promises were invented.
- ⛔ Jurisdiction-appropriate legal review of Privacy/Terms has not
  happened. **Owner: Product Owner**, before onboarding real paying
  customers under these terms.

## Summary

**Not launch-blocked by anything in this codebase.** The application
itself — build, tests, accessibility, the full product loop, and the
billing code path — is sound and proven. What's actually blocking a
real launch is entirely external configuration this session has no
access to: a production database and hosting target, the Shopify
store's product/selling-plan/webhook setup, an email sending domain,
and legal review. All are named above with an owner and a concrete
next step — none are guessed at or assumed done.

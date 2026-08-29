# Validation Report — M2: Running Application Foundation

- **Milestone ID:** M2
- **Objective:** Implement the M1-selected stack as a real, running
  Next.js application shell inside `feedback/**` — public entry shell,
  authenticated-app layout foundation, reusable design primitives,
  Drizzle/Neon connection foundation (no schema), Better Auth
  foundation (no account UI), environment validation, and a real
  Vitest + Playwright test suite. No product features.
- **Repository:** `askgeniebhai/hamix`
- **Branch:** `claude/feedback-m2-scaffold`
- **Starting SHA:** `a8087db63f2312274615f1c0f2e61849237f7098` (tip of
  `main` immediately after PR #23 / M1 merged)
- **Ending SHA:** `4d265fbde7b97e8cbc7faba16e2fbbff723ae04b`
- **Files changed:** 46 files, all under `feedback/**`:
  application code (`app/`, `components/`, `lib/`), config
  (`package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`,
  `eslint.config.mjs`, `postcss.config.mjs`, `components.json`,
  `drizzle.config.ts`, `vitest.config.ts`, `playwright.config.ts`,
  `.gitignore`, `.env.example`), tests (`tests/unit/`, `e2e/`), and
  `.github/workflows/feedback-ci.yml`.

## What was built

- **Framework:** Next.js 16.3.3 (App Router, Turbopack), React 19.2.8,
  TypeScript, scaffolded via the official `create-next-app` CLI (not
  hand-written boilerplate), then merged into `feedback/` without
  touching any governance file.
- **Design system:** Tailwind CSS v4 + shadcn/ui (Base UI primitives,
  "Nova" preset: Lucide icons, Geist font). Original design-token
  edits: a restrained indigo accent for `--primary`/`--ring`, and a
  darkened `--muted-foreground` for WCAG AA contrast (see "Failures
  discovered"). Primitives added: Button, Card, Alert, Avatar,
  Dropdown Menu, Separator, Skeleton, plus a custom `EmptyState`.
- **Public entry shell:** `app/page.tsx` — header, hero, three
  descriptive (non-functional) pillar cards, footer.
- **Authenticated-app layout foundation:** `app/(workspace)/layout.tsx`
  — sidebar (real "Dashboard" link + labeled-but-inert "coming soon"
  items) and topbar (workspace label + account dropdown placeholder),
  with `app/(workspace)/dashboard/page.tsx` rendering an `EmptyState`.
- **Loading/error/empty-state foundations:** `app/loading.tsx`
  (Skeleton-based), `app/error.tsx` (Alert + retry, client component),
  `app/not-found.tsx` (`EmptyState`) — all via Next.js's own file
  conventions, not custom state-management.
- **Drizzle + Neon foundation:** `lib/db/index.ts` (lazy `neon-http`
  client) and `lib/db/schema.ts` (intentionally empty — no domain
  tables), `drizzle.config.ts`.
- **Better Auth foundation:** `lib/auth/index.ts` (server instance with
  the `organization()` plugin, per `docs/M1_ARCHITECTURE_DECISION.md`),
  `lib/auth/client.ts`, `app/api/auth/[...all]/route.ts`. Not imported
  by any page — no sign-in/sign-up UI.
- **Environment validation:** `lib/env.ts` (Zod schema, lazily
  parsed/memoized), `.env.example`.
- **Health check:** `app/api/health/route.ts`.
- **Tests:** `tests/unit/` (Vitest: env-schema validation, `EmptyState`
  component) and `e2e/shell.spec.ts` (Playwright: health check, shell
  render, navigation, responsive smoke on desktop + mobile projects,
  zero horizontal overflow, automated accessibility scans via
  `@axe-core/playwright`, 404 handling).

## Stack installed

Runtime: `next@16.3.3`, `react@19.2.8`, `react-dom@19.2.8`,
`drizzle-orm@^0.45.2`, `@neondatabase/serverless@^1.1.0`,
`better-auth@^1.7.2`, `zod@^4.5.2`, `@base-ui/react@^1.7.0`,
`lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`,
`tw-animate-css`.
Dev: `typescript`, `eslint` + `eslint-config-next`, `tailwindcss@^4` +
`@tailwindcss/postcss`, `drizzle-kit@^0.31.10`, `vitest@^4.1.11` +
`@vitejs/plugin-react` + `jsdom` + `@testing-library/react` +
`@testing-library/jest-dom`, `@playwright/test@^1.62.1` +
`@axe-core/playwright`, `shadcn`.

## Runtime result

`next build` succeeds cleanly with **no environment variables set** —
confirmed deliberately, since `lib/env.ts`/`lib/db`/`lib/auth` are
lazily constructed (see `DECISIONS.md` D2-001) and nothing in the
rendered shell touches them. Route manifest:

```
┌ ○ /                       (static)
├ ○ /_not-found              (static)
├ ƒ /api/auth/[...all]       (dynamic)
├ ƒ /api/health              (dynamic)
└ ○ /dashboard                (static)
```

`next start` serves the production build; `GET /api/health` returns
`{"status":"ok"}`.

## UI result

Verified visually via full-page screenshots taken against the running
production build (desktop 1280×800 and mobile 390×844 viewports) —
Geist typography, the calm neutral palette with the restrained indigo
accent, generous whitespace, consistent card/button radius, and a
clean single-column reflow on mobile with no cramped or broken layout.
Screenshots are not committed (not durable evidence artifacts for this
repo) but were reviewed as part of this validation.

## Tier 1 — Code / Static Quality

**Result: PASS**

| Check | Command | Result |
|---|---|---|
| RepoGuard | `node feedback/scripts/repo-guard.js --base origin/main` | PASS |
| RepoGuard self-test | `node feedback/scripts/repo-guard.js --self-test` | PASS (14 assertions) |
| JS syntax (non-app files) | `find ... -name '*.js' \| xargs node --check` | PASS |
| JSON validation | `find ... -name '*.json' \| xargs node -e '...JSON.parse...'` | PASS (6 files) |
| Lint | `npm run lint` (ESLint, `eslint-config-next`) | PASS, 0 problems |

## Tier 2 — Build / Integration

**Result: PASS**

| Check | Command | Result |
|---|---|---|
| Clean install | `npm ci` | PASS |
| Production build | `npm run build` | PASS |
| Type check | `npm run typecheck` (`tsc --noEmit`) | PASS |
| Unit tests | `npm run test` (Vitest) | PASS — 6/6 |
| Drizzle config validity | `drizzle-kit check` (empty schema, placeholder `DATABASE_URL`) | PASS — "Everything's fine" |

## Tier 3 — Runtime / End-to-End

**Result: PASS**

This is the first milestone where Tier 3 means real behavior, not the
M0/M1 bootstrap interpretation — per `VALIDATION.md`, the bootstrap
definition is retired now that a runtime exists.

| Check | Result |
|---|---|
| App builds, launches, and serves traffic | PASS (`next build && next start`, `/api/health` → 200) |
| Page loads (`/`, `/dashboard`, unknown route → 404) | PASS |
| Shell renders (header/nav, hero, cards, footer; sidebar/topbar) | PASS |
| Navigation works (`/` → `/dashboard` via the header link) | PASS |
| Desktop + mobile responsive smoke | PASS (two Playwright projects: Desktop Chrome, Pixel 7) |
| No horizontal overflow | PASS (`scrollWidth <= clientWidth` on both routes) |
| Basic accessibility | PASS (`@axe-core/playwright`, zero violations, all four page states) |
| Runtime healthy | PASS (`/api/health` returns `{"status":"ok"}`) |

**20/20 Playwright tests pass** (10 checks × 2 device projects).

## Failures discovered (and fixed, in the order found)

1. **Build-time crash from eager `getAuth()` call.** The first version
   of `app/api/auth/[...all]/route.ts` called `getAuth()` at module
   top level; `next build` failed with a `ZodError` for missing
   `DATABASE_URL`/`BETTER_AUTH_SECRET` because Next.js executes route
   modules during build-time page-data collection, not only at request
   time. **Fix:** moved the call inside the exported `GET`/`POST`
   function bodies. Verified: clean `next build` with zero environment
   variables set. See `DECISIONS.md` D2-001.
2. **RepoGuard false positive on `.env.example`.** The Dangerous File
   Guard's `.env` pattern matched `.env.example` too, since it's a
   real, intentionally-committed, secret-free template. **Fix:**
   excluded `.env.example`/`.sample`/`.template` via a negative
   lookahead, with a new self-test assertion locking in both the
   positive case (`.env.local` still flagged) and the negative case
   (`.env.example` not flagged).
3. **Duplicate-labeled navigation link ambiguity (test precision, not
   an app bug).** The hero CTA and header nav both say "Open
   workspace"; the E2E test's initial locator matched both. **Fix:**
   scoped the test to `getByRole('banner')`.
4. **WCAG AA color-contrast failure.** Axe found the shipped shadcn
   default `--muted-foreground` (`oklch(0.556 0 0)`) against
   `--muted` (`oklch(0.97 0 0)`) measured 4.34:1, short of the 4.5:1
   AA minimum, on the account-menu avatar fallback text. **Fix:**
   darkened to `oklch(0.47 0 0)`. Re-verified via axe: 0 violations.
5. **Missing page-level `<h1>`.** Axe's `page-has-heading-one` rule
   failed on `/dashboard` — `EmptyState` rendered its title as `<h2>`
   with no other heading on the page. **Fix:** made `EmptyState`'s
   heading level configurable (`headingLevel`, default `h2`), and
   pass `"h1"` from `dashboard/page.tsx` and `not-found.tsx`, where
   `EmptyState` is the page's only content.
6. **Missing landmark region / broken skip-link target on
   `not-found.tsx`.** Root layout's skip-link targets `#main-content`,
   but `not-found.tsx` didn't render a `<main>` at all (axe: "region" —
   content not contained by a landmark; "skip-link" — no target).
   Root `loading.tsx` and `error.tsx` had the same latent gap (not
   independently tested by axe, but the same structural cause).
   **Fix:** wrapped all three in `<main id="main-content">`.
7. **Broken font token wiring.** `app/globals.css`'s `@theme` block
   shipped `--font-sans: var(--font-sans)` — a self-referential,
   invalid definition from the shadcn init template — instead of
   pointing at the actual Geist variable set by `next/font` in
   `layout.tsx`. Effect: the browser silently fell back to its default
   serif font for the `<h1>` (visually confirmed via screenshot before
   the fix). **Fix:** `--font-sans: var(--font-geist-sans)`, matching
   the already-correct `--font-mono: var(--font-geist-mono)` line.
   Re-verified via screenshot: Geist renders correctly throughout.
8. **Stale local Playwright browser revision (environment, not app).**
   The sandboxed dev environment's pre-installed Chromium (rev 1194)
   didn't match what the pinned `@playwright/test@1.62.1` expects (rev
   1234). **Fix:** added an optional
   `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override in
   `playwright.config.ts`, unset by default so CI's own
   `playwright install --with-deps chromium` (which fetches the
   matching revision) is unaffected — used only for local validation
   in this session.

No test, guard, or check was skipped, weakened, or marked `NOT
APPLICABLE` to obtain a passing result.

## Security observations

- No secrets committed; RepoGuard's Secret Guard and Dangerous File
  Guard both pass against the full 60-file tracked tree.
- `lib/env.ts`, `lib/db`, `lib/auth` fail closed (throw) if
  misconfigured when actually used — matches `SECURITY.md`'s "safe
  failure modes" — and are never exercised by the parts of the app
  that run in M2, so there is nothing live to misconfigure yet.
- API keys/secrets for Neon, Stripe, Resend, PostHog, Vercel are not
  requested, generated, or referenced anywhere in this milestone —
  only `.env.example` placeholders for the two variables the Better
  Auth/Drizzle foundation itself needs once actually used.
- **Known, accepted risk:** `drizzle-kit`'s bundled `@esbuild-kit/*`
  dependency pulls a moderate-severity, dev-server-only advisory
  (`GHSA-67mh-4wv8-2f99`, stale `esbuild` request-forgery in the CLI's
  own dev tooling — not shipped to the production build or runtime).
  No fixed stable `drizzle-kit` release exists yet (`1.0.0` is still
  release-candidate); `npm audit fix --force` would downgrade to
  `drizzle-kit@0.18.1`, a materially older, breaking version. Per
  `docs/ENGINEERING_PRINCIPLES.md`'s dependency-discipline guidance
  (weigh maintenance/security against forcing a worse alternative),
  this is documented and accepted rather than forced; re-evaluate when
  `drizzle-kit` 1.0 stabilizes.

## Known limitations

- No domain schema or migrations exist yet — `lib/db/schema.ts` is
  intentionally empty, per M2's explicit scope.
- No account/session UI exists — Better Auth is configured but never
  imported by a page; `/dashboard` is not actually access-controlled.
- `feedback-ci.yml`'s Tier 2 and Tier 3 jobs each run their own
  `npm ci`/build rather than sharing artifacts between jobs (separate
  GitHub Actions runners); this costs perhaps a minute of redundant
  CI time in exchange for keeping each tier job self-contained and
  independently rerunnable — acceptable at this project's current
  scale.
- The public marketing page's three pillar cards use shadcn's
  `CardTitle` (a styled `<div>`, not a semantic heading) for
  "Capture"/"Organize"/"Prioritize" — visually correct and not an axe
  violation, but a minor semantic-heading refinement worth revisiting
  once more marketing content exists.
- This report's CI results reflect local validation; the GitHub
  Actions run itself should be confirmed green on the PR before merge
  (see the final report for live status).

## Final `git status`

```
On branch claude/feedback-m2-scaffold
Your branch is ahead of 'origin/main' by 1 commit.

nothing to commit, working tree clean
```

# UI/UX Commercial Benchmark — Feedback vs. Canny

M9 Part A/B. Method: our own production build was run in a real
browser (Playwright, Chromium) and driven through a full realistic
session — signup, workspace creation, four public feedback
submissions, a customer comment, admin triage through every status,
a published changelog entry, and the billing page — capturing
screenshots at ~1440px (desktop) and ~390px (mobile) for every major
surface (`docs/../validation/reports/M9-validation-report.md` links
the full screenshot set). Canny was researched through its own
publicly accessible surfaces: the live public board at
`feedback.canny.io`, and Canny's own marketing (`canny.io/features`,
`canny.io/pricing`) and help-center pages (`help.canny.io`) — never
its private admin product, which isn't publicly reachable and isn't
guessed at anywhere below. No Canny code, layout, copy, or asset was
copied; every "ours" screenshot and every "Canny" description below
is independently sourced.

**A general note on comparability:** Canny is a mature, funded product
with years of iteration; this is a pre-launch build. The fair
question isn't "is every pixel as polished as Canny's" — it's "does
our simpler, smaller surface area let us be *clearer* where Canny is
*more capable*." That's the lens every row below uses.

## Public board (Feedback tab)

| | |
|---|---|
| **Ours** | Board header, a shared Feedback/Roadmap/Changelog tab strip, then an **always-visible inline submission form** (title, details, name, email), then the request list (vote count, status badge, comment count). Clean typography, generous whitespace, no visual noise. |
| **Canny** | Board header with category tabs (their multi-board concept), a status-grouped roadmap view alongside the flat list, prominent vote-count chip on the left of each row, search. Submission is a separate action (a button/modal), not an always-open form. |
| **Our weakness** | The submission form is the *first* thing a visitor sees, pushing every existing request below the fold — on mobile, a visitor scrolls through five form fields before seeing a single other customer's request. That's the opposite of what builds trust and reduces duplicate submissions (seeing "12 people want this too" before writing your own). |
| **Our advantage** | No forced categories/multi-board complexity to navigate before you can submit — one board, one obvious action. Status badges and vote/comment counts are legible and calmer than a dense list. |
| **Change required** | Move the submission form behind an explicit "Share feedback" toggle/button, list-first — request list is the first thing below the header on both a fresh page load and a returning visit. |
| **Why it helps** | Reduces time-to-value for the reader (browsing) over the writer (submitting) — most visitors browse before they contribute, and seeing real demand first is itself social proof that this board is alive. Directly serves Part B's "immediate comprehension" and "click count" measures. |

## Post detail / thread

| | |
|---|---|
| **Ours** | Title, description, vote control, status, a Follow/Stop-following toggle, then the comment thread (customer replies vs. team replies visually distinct). |
| **Canny** | Similar shape — a post detail with comments, admin responses visually marked, status changes surfaced. |
| **Our weakness** | None found in this session's own testing — the flow (vote → follow → comment) worked cleanly with no dead ends or confusing states. |
| **Our advantage** | The Follow control is a single, honest, separate action from voting/commenting/submitting (M8's explicit no-fabricated-consent design) — a visitor is never surprised to discover they're "following" something they never opted into. |
| **Change required** | None for this milestone. |
| **Why it helps** | Trust: a customer who explicitly and knowingly opted in is a real, engaged subscriber, not an inflated number the business will see churn/complain later. |

## Public Roadmap

| | |
|---|---|
| **Ours** | Three columns (Planned / In Progress / Complete), each card showing title, a status badge, vote count, comment count. |
| **Canny** | Status-grouped view within the same feedback list (Under Review / Planned / In Progress counts shown), not a separate three-column kanban-style page in what we could observe publicly. |
| **Our weakness** | Each card repeats the column's own status as a badge inside the card too ("PLANNED" column header, then a "● Planned" badge on every card in it) — redundant information the reader already has from the column position. |
| **Our advantage** | A dedicated, single-purpose Roadmap page is easier to share as a public "here's what's coming" link than a filtered view of a bigger list — cleaner for a customer email or a support reply ("check the roadmap: yourcompany.com/b/acme/roadmap"). |
| **Change required** | Drop the per-card status badge; the column already carries that information. Minor — deferred unless it proves confusing in real use, per revenue discipline (this doesn't block a sale). |
| **Why it helps** | Marginal, not scored as a launch blocker — noted for completeness (Part B asks for "information density" as a measure) but not acted on this milestone. |

## Public Changelog

| | |
|---|---|
| **Ours** | Newest-first entries, each with publish date, title, body, and a pill linking back to the originating request(s). |
| **Canny** | Positions the changelog as "your home for all previous product updates," explicitly tracing each entry back to the customer demand behind it, with markdown formatting and custom labels; also offers an embeddable in-product widget and Pro-tier email notifications. |
| **Our weakness** | No labels/categories (Canny's "organize by feature type or product area") and no embeddable widget — both explicitly out of scope for M8/M9 by the Product Owner's own instruction, not an oversight. |
| **Our advantage** | The "traces back to customer demand" idea Canny markets as a feature is **structural** in ours, not optional: a changelog entry can only ever link to a post that customers actually asked for and voted/commented on (M8's link rule), and the linked-request pill is present on every entry by construction — there's no path to publishing a changelog entry that *isn't* connected to real demand. |
| **Change required** | None for this milestone — labels/widget are correctly deferred (`DO NOT BUILD` list). |
| **Why it helps** | This is a genuine, defensible differentiation claim for sales copy: "every update we ship traces to a real customer request — see for yourself" is *true* of this product by construction, not a marketing gloss. |

## Admin dashboard (`/dashboard`)

| | |
|---|---|
| **Ours** | A static "workspace is ready" empty state with a "View feedback" link — **identical regardless of how much real activity exists**. Confirmed directly: captured with zero posts and again after 4 submissions, a customer comment, and full status triage — pixel-identical. The description text reads *"Roadmap and changelog tools will appear here in a future milestone"* — **false**; both have shipped (M7, M8) and are live on this exact workspace's public board. |
| **Canny** | Their own help documentation describes a dashboard that surfaces actionable items directly — e.g. the top stale posts needing attention — so opening the admin isn't a dead end. |
| **Our weakness** | This is the single most consequential UX gap found in this benchmark, not a cosmetic one. A first-time business owner logs in, sees a message that's factually wrong about their own product, and gets no orientation toward what needs their attention. Part C's own acceptance question — "what needs my attention, without learning the software first?" — is currently unanswerable from this page. |
| **Our advantage** | N/A — this is a clear deficit, named honestly. |
| **Change required** | Rebuild `/dashboard` (this milestone, see Part C polish below) to show: the public board URL front and center (Part K's #1 ask), a real open-requests count with a direct link, and correct, current copy. |
| **Why it helps** | Directly serves activation (Part K) and retention (an admin who returns to a dead page stops returning) — the highest-leverage single fix in this entire benchmark for the stated commercial goal. |

## Admin feedback list & detail (triage)

| | |
|---|---|
| **Ours** | A flat list with search/sort/filter, status badges, vote/comment counts, and the public board URL shown right at the top of the page. Clicking a request opens a full-page detail with the status dropdown and the reply thread. |
| **Canny** | Bulk multi-select (⌘/Shift-click) for status changes across many posts at once, and a right-hand detail panel (list and detail visible together) rather than full-page navigation per post. |
| **Our weakness** | No bulk status change — each request is triaged one at a time, exactly the pain point one of this session's own seeded demo posts describes ("Bulk status updates on the requests list"). At even moderate volume (a few dozen open requests) this becomes real friction for a business owner doing weekly triage. |
| **Our advantage** | Full-page detail (vs. a cramped side panel) reads far better on mobile — Canny's side-panel pattern doesn't have an obvious mobile analog; ours degrades to the same page, just full-width, with zero rework. |
| **Change required** | None this milestone — bulk actions are a real, evidenced feature gap but a multi-day build, not a polish-pass change; correctly deferred until it blocks a real prospect (revenue discipline). Recorded here so it isn't lost. |
| **Why it helps** | Documented so the next milestone that touches triage doesn't have to rediscover this from scratch. |

## Sidebar navigation

| | |
|---|---|
| **Ours** | Dashboard / Feedback / Changelog / Settings, plus a "Coming soon" section listing "Roadmap." |
| **Canny** | N/A (private admin, not benchmarked). |
| **Our weakness** | "Roadmap" under "Coming soon" is **stale and wrong** — Roadmap shipped in M7 and is live on the public board every workspace already has. This is the same class of bug as the dashboard's false copy: an admin literally cannot discover their own live Roadmap feature from the one navigation surface that's supposed to orient them. |
| **Our advantage** | — |
| **Change required** | Remove the "Coming soon" section entirely (nothing is legitimately upcoming from the sidebar's point of view — the admin roadmap console was a deliberate M7 non-build decision, not a pending feature) or repoint it at something genuinely upcoming when one exists. |
| **Why it helps** | Same as the dashboard fix — an admin who can't find a feature that already exists never uses it, and never mentions it to their customers. |

## Billing (`/settings/billing`)

| | |
|---|---|
| **Ours** | Current plan badge, a tracked-participant usage bar with the exact count/limit, a plain-language definition of "tracked participant," and an Upgrade-to-Pro button that hands off to the existing Shopify store's checkout. |
| **Canny** | "Tracked users" is Canny's own load-bearing term for the identical concept, with an FAQ specifically addressing "what counts as a tracked user" — evidence this is a genuinely confusing concept worth over-explaining, which we already do inline rather than relegating to a separate FAQ page. |
| **Our weakness** | No visible "what happens if I go over the limit" explanation on this page itself (the behavior is correct and non-destructive — Part G — but isn't described here, only discoverable by actually hitting it). |
| **Our advantage** | The exact 25-Free/100-Pro numbers were arrived at independently and happen to match Canny's own published tiers — external validation that these are reasonable, market-tested limits, not guesses. |
| **Change required** | Add a one-line note near the usage bar: "At the limit, everyone already tracked keeps working — only brand-new participants are paused until you upgrade." |
| **Why it helps** | Removes a real "what happens to my existing customers if I don't upgrade in time" anxiety before it becomes a support question or a reason to hesitate on Free. |

## Root / public entry (`/`)

| | |
|---|---|
| **Ours** | A generic three-card marketing shell ("Capture / Organize / Prioritize"), the product literally labeled a "working name," no pricing, no explanation of Roadmap/Changelog, a single "Open workspace" CTA and no visible "Log in." |
| **Canny** | Canny's own marketing leads with outcome-oriented copy ("Canny costs less than building the wrong features"), explicitly walks through Feedback → Analysis → Roadmap/Changelog as one connected system, and its pricing page leads with the Free tier and a clear "Most popular" Pro tier. |
| **Our weakness** | This is not a SaaS home page yet — Part J's mandate directly. No pricing is shown anywhere before signup, the product has no name, and the three feature cards don't mention Roadmap or Changelog by name at all, despite both being fully shipped, working product. |
| **Our advantage** | Calm, uncluttered, no exaggerated claims already (nothing to walk back) — the redesign in Part J below can build on genuinely honest copy rather than having to first strip out marketing excess. |
| **Change required** | Full rebuild — see Part J below. |
| **Why it helps** | This is the literal first thing a prospect sees; Part J's entire justification. |

## Onboarding (signup → workspace → first value)

| | |
|---|---|
| **Ours** | Signup → name a workspace → land on the (currently broken, see above) dashboard. The public board URL is *not* shown until the admin separately navigates to `/feedback`. |
| **Canny** | N/A (private flow, not benchmarked) — but Canny's own "Getting started" help-center collection exists specifically because this moment needs explaining, which is itself a signal it matters. |
| **Our weakness** | The single most important artifact a new business needs — their shareable public feedback URL — is one extra click away from the page they land on immediately after setup, and that page currently claims two of the three things they'd share it for don't exist. |
| **Our advantage** | Genuinely lightweight — three fields, no wizard, no forced tour. Matches Part K's "no giant onboarding wizard" instruction exactly already. |
| **Change required** | Surface the public board URL directly on the (rebuilt) dashboard — see Part C/K below; the onboarding *flow* itself needs no new steps, just a better landing page. |
| **Why it helps** | Shortens time-to-first-value to zero extra clicks — the thing they'll share with customers is the first thing they see. |

## Accessibility & responsive (both, at ~1440px and ~390px)

Verified directly, not assumed: zero horizontal overflow on every
captured surface at both widths (`overflow-report.json` in this
milestone's screenshot set), touch-sized controls, and the existing
`@axe-core/playwright` suite (unchanged by this milestone, still
green — see the M9 validation report) covers automatic WCAG 2.1 A/AA
checks on every route this benchmark covers.

## Summary

Nothing in this product is *broken*. The core loop (submit → vote →
discuss → follow → triage → roadmap → changelog) works cleanly on a
real browser at both breakpoints. The gap to close before this reads
as "worth paying for" isn't decoration — it's **two literal falsehoods
in the admin's first-run experience** (the dashboard's stale copy, the
sidebar's stale "coming soon") and **a missing front door** (the root
page and pricing). Both are addressed in this milestone's polish pass
below.

## Part P — Acceptance-bar answers (post-polish-pass)

Everything above this section is the *before* benchmark, kept intact
rather than rewritten, so the change is auditable. This section
answers, plainly, what actually changed and where things honestly
stand now — evidence, not ego; nothing below claims "better than
Canny" without a specific reason.

**Where we were weaker than Canny, and what changed:**

- **Public board led with the submission form, not real demand.**
  Fixed — `components/feedback/submit-feedback-toggle.tsx` collapses
  the form behind a "Share feedback" button; the request list renders
  first on every load, matching the exact "Change required" line
  above.
- **The admin's first-run screen contained two outright falsehoods**
  (a static empty-state claiming no requests existed regardless of
  real data, and a sidebar entry marking the already-shipped Roadmap
  "coming soon"). Fixed — the dashboard now queries
  `getFeedbackSummary`/`getEntitlement` for real counts, and the
  sidebar's stale entry is gone (`components/layout/app-sidebar.tsx`).
- **The public board URL — the single artifact a new business needs
  most — was one extra click away from the post-onboarding landing
  page.** Fixed — `components/dashboard/public-board-url.tsx` puts it,
  copyable, at the top of the dashboard.
- **The root page wasn't a commercial front door at all.** Fixed —
  `app/page.tsx` now states the product promise, names the
  Feedback/Roadmap/Changelog loop explicitly, and shows real Free/Pro
  pricing sourced from `lib/billing/plans.ts` (never a hardcoded
  second copy of the numbers).
- **No legal/trust pages existed.** Fixed, as honest placeholders —
  `/privacy`, `/terms`, `/contact` — each explicitly marked pending
  Product Owner/legal review rather than inventing a company
  registration or address (Part M).

**A gap this benchmark's first pass didn't catch, found afterward by a
real cross-viewport E2E run, not by inspection:** the workspace had
**no mobile navigation at all** — `AppSidebar` is `hidden md:flex` and
nothing filled that gap, so an admin on a phone could reach the
dashboard but nothing else. Fixed with `components/layout/mobile-nav.tsx`,
a persistent bottom tab bar (`DECISIONS.md` D9-002 has the full
reasoning, including why a hamburger/drawer was rejected in favor of
it). This is exactly the kind of thing a benchmark-by-reading misses
and a benchmark-by-using-the-product-at-both-breakpoints catches — the
justification for Part D's screenshot-and-overflow-check requirement
in the first place.

**Where we are now genuinely better, with a specific reason (not
vibes):**

- **Simpler by construction, not by omission.** One board, no
  category/multi-board navigation to learn before submitting anything
  — a smaller surface area is a real advantage for the first 20–25
  customers this milestone targets, who are evaluating "can I explain
  this to my team in one sentence," not "does it have everything
  Canny has."
- **The core loop is transparent end to end**: every roadmap card and
  every changelog entry links back to the exact request that drove it
  (`app/b/[slug]/roadmap/`, `app/b/[slug]/changelog/`) — nothing is
  presented as having appeared from nowhere.
- **Pricing is stated plainly on the marketing page itself** (`/#pricing`),
  not gated behind a "talk to sales" pattern or hidden entirely (a
  pattern some competitors in this space use, and one Canny itself
  does not — this is a neutral design choice, not a claim about Canny).

**What remains genuinely inferior to Canny, honestly, and is correctly
deferred rather than missed** — every item below is on M9's explicit
"DO NOT BUILD" list, not an oversight:

- No multi-board/category support — one board per organization only.
- No public search across requests on the board itself.
- No richer roadmap view (columns beyond Planned/In Progress/Complete,
  dates/ETAs, drag-and-drop reordering).
- No rich-text changelog editor (plain text body only).
- No established-product trust signals a years-old product accrues
  for free (a large public reference-customer board with heavy real
  activity, a dedicated security/compliance/status page, integrations
  marketplace).

**What cannot be honestly compared at all** — Canny's actual private
admin console, its real onboarding flow content, its internal
duplicate-detection/merge UI, and anything behind its authenticated
product were never accessed and are not described or estimated
anywhere in this document, per Part A's explicit boundary. Any
apparent gap or advantage in those areas is unknown, not claimed
either way.

# Product Direction — Evidence-Driven Demand Intelligence & Acquisition

**Status:** Permanent Product Owner directive, recorded 2026-08-29
(`DECISIONS.md` D2-004). This is product/business positioning
documentation — not an implementation instruction. **No feature
described here is authorized for implementation** until a specific
milestone scopes it; see "Boundaries" below. Referenced by
[`PROJECT_CONSTITUTION.md`](../PROJECT_CONSTITUTION.md) Rule 1
(Business First) and [`MILESTONES.md`](../MILESTONES.md).

## Core business model (unchanged)

This project reproduces the proven Canny-style SaaS mechanism
(`README.md`, `PROJECT_CONSTITUTION.md` Rule 1): capture feedback →
organize → deduplicate → prioritize → roadmap → changelog → close the
loop with customers → recurring SaaS revenue, expanding from free
entry to paid tiers to enterprise. That remains the first product
foundation. Everything below is additional direction on *how customers
are acquired* and *what the platform's intelligence should ultimately
do with the feedback it collects* — it does not replace or precede the
core build.

## Two acquisition paths

1. **Self-serve.** A business discovers the product, signs up, and
   starts using it — the default SaaS motion `TECH_STACK.md` and
   `M1_ARCHITECTURE_DECISION.md` are built to support.
2. **Proactive.** The company identifies suitable businesses/websites
   and approaches them directly, offering to help them capture and
   understand their own customers' feedback — demonstrating useful
   insight to convert them into recurring customers, rather than
   waiting for inbound discovery alone.

Product and onboarding decisions in future milestones should keep both
paths viable — e.g. an onboarding flow that only makes sense for a
self-signed-up user, with no path for someone being onboarded by a
sales/success contact on a prospect's behalf, would foreclose path 2.

## The proactive path is evidence-driven, not opinion-driven

This is the permanent constraint on path 2, stated explicitly because
it is easy to get wrong: **the platform does not scan a business's
website or product and invent weaknesses, and it does not present our
own opinion of what's wrong.** Every recommendation must be traceable
to real signals the business's own customers provided. This is a
different product category from a website-audit or SEO-weakness
scanner — see "Boundaries" below.

**Flow:** business → capture customer/user feedback → comments and
conversations → categorize → semantic deduplication → sentiment /
urgency signal → recurring-demand detection → weight by customer /
revenue importance → identify real problems and requests → generate
evidence-backed directions → business takes action → measure the
outcome → continue the feedback cycle.

**Illustrative example** (not a built feature — shows the shape of the
intended output): 47 customers report checkout difficulty, 18 of them
abandoned a purchase, most are on mobile, and several are high-value
accounts → the platform's output is *"Priority recommendation: improve
the mobile checkout flow,"* grounded in the customer count, abandonment
data, device split, and account value — not a generic best-practice
opinion.

**Permanent principle:** customers tell us what is wrong; the platform
turns their signals into clear, evidence-backed business and product
direction. It does not tell customers or businesses what *we* think is
wrong.

## Long-term product positioning

The product should progressively become more than "feedback board
software":

**Customer Feedback → Customer Demand Intelligence → Actionable
Business/Product Direction → Outcome Learning.**

Each stage builds on real, captured customer signal — none of it is
inference from inspecting a business's website, code, or product
independent of what customers actually said.

## Boundaries

- **Not a website-audit or SEO-weakness-scanning product.** Do not
  mix this positioning with that category, in messaging, features, or
  future architecture. If a future milestone proposes anything that
  inspects a prospect's site/product and generates findings *without*
  underlying customer feedback data, that is out of this product's
  scope as currently directed — raise it explicitly rather than
  folding it in.
- **No unauthorized implementation.** This document records direction
  for future milestones to preserve, not an authorization to build
  categorization, deduplication, sentiment analysis, demand detection,
  or recommendation generation now. Canny-style feedback capture,
  organization, and roadmap/changelog remain the first product
  milestones (`MILESTONES.md`); demand-intelligence and proactive-
  acquisition tooling are later, separately-authorized milestones that
  should be designed consistently with this document when their time
  comes.

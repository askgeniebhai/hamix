# Design Principles — Premium, Apple-Inspired UI/UX Standard

**Status:** Permanent directive from the Product Owner, recorded
2026-08-29 (`DECISIONS.md` D0-005). Applies to all `feedback/**`
user-facing work from the next approved milestone onward. Referenced
by [`PROJECT_CONSTITUTION.md`](../PROJECT_CONSTITUTION.md) Rule 12.
Component/library selection below waits until the technology stack is
chosen (`ARCHITECTURE.md`) — this document sets the *standard*, not
the toolset.

## The requirement

The product must feel like premium, modern software from its earliest
usable version — calm, premium, fast, focused, modern, trustworthy.
The benchmark is **Apple-inspired design quality**: their design
*philosophy and level of polish*, not their website, products,
proprietary assets, or exact UI. See "Canny reference rule" and
"Boundaries" below — inspiration is permitted, copying is not.

The first-open reaction should be: *"this looks like serious, premium
software."* Not an amateur admin template, a generic Bootstrap
dashboard, a pile of mismatched components, a student project, an
AI-generated page with excessive gradients, a crowded ERP, or an old
CRM.

## Visual principles

- **Simplicity** — remove visual clutter; the interface should
  immediately communicate what the user needs to do.
- **Generous whitespace** — breathing room used intentionally, not
  crammed information density.
- **Strong typography** — a clear hierarchy: large confident headings,
  restrained supporting text, highly readable body text, consistent
  weights, careful line spacing. Use legally permitted fonts or system
  font stacks; do not depend on proprietary Apple fonts without clear
  licensing.
- **Calm visual language** — neutral backgrounds, restrained accent
  colors, subtle borders, thoughtful contrast, minimal visual noise.
- **Subtle depth** — soft shadows, layered surfaces, translucency and
  light borders used carefully for elevation; never overused.
- **Rounded geometry** — a coherent, consistent radius system across
  cards, controls, panels, modals, and buttons.
- **Smooth interaction** — polished, intentional transitions.
  Animation communicates state and direction; it does not decorate.
- **Precision** — alignment, spacing, typography, icons, and
  interaction states must feel deliberate, not approximate.

## Design system, from early UI development

When UI implementation begins, establish a small reusable design
system before styling individual pages:

**Tokens:** typography, spacing, radius, shadows, borders, surfaces,
text hierarchy, accent colors, success/warning/error states,
interaction states, responsive breakpoints.

**Primitives:** Button, Input, Select, Dialog, Card, Badge, Tabs,
Dropdown, Tooltip, Toast, Table, Empty State, Loading State,
Navigation, Sidebar, Page Header — built (or adopted, per
[`ENGINEERING_PRINCIPLES.md`](./ENGINEERING_PRINCIPLES.md)) once and
reused everywhere, not restyled per page.

**Reuse first here too:** evaluate reputable, accessible headless UI
primitives, open-source component systems, icon systems, animation
and responsive-layout utilities, and form components before building
from scratch. Choose the smallest solution that supports
accessibility, customization, performance, and a consistently premium
look — never adopt a UI library merely because it's popular.

## Accessibility is part of premium design

Apple-inspired aesthetics must not sacrifice usability: keyboard
navigation, visible focus states, sufficient contrast, semantic
markup, labels, screen-reader compatibility where practical, adequate
target sizes, and understandable validation/error messaging are
product-quality requirements, not extras.

## Responsive quality

Design deliberately for desktop, laptop, tablet, and mobile where the
workflow warrants it. Responsive behavior must be intentional — not a
desktop layout shrunk until it technically fits.

## Performance is part of look and feel

A beautiful application that feels slow is not premium. Fast initial
rendering, responsive interaction, sensible loading states, skeletons
where appropriate, minimal layout shift, efficient data fetching,
restrained bundle sizes, and lazy loading where useful all contribute
to whether the product *feels* premium, not just whether it *looks*
premium in a screenshot.

## No placeholder quality on user-facing screens

During implementation, prototype code may be temporarily crude
internally, but UI work is not complete — and cannot pass milestone
validation — with crude temporary styling, random colors, unconsidered
default browser controls, inconsistent spacing, broken responsive
layouts, or unhandled empty/loading/error states.

## Tier 3 extension: UI validation

Once user-facing application screens exist, `VALIDATION.md`'s Tier 3
(Real Runtime / End-to-End) must include visual and interaction
verification, using real browser automation where tooling permits:
navigation, responsive layouts, forms, dialogs, loading/empty/error
states, keyboard interactions, primary user journeys, layout overflow,
and obvious visual regressions. Screenshots or browser inspection may
serve as validation evidence. A successful backend test does not prove
UI quality, and a milestone report may not claim UI completeness
without this evidence (Constitution Rule 9, Evidence-Based
Completion).

## Priority order

Visual quality matters, but does not excuse broken functionality, and
broken functionality is not excused by good visuals either:

**correct workflow → reliable functionality → excellent usability →
premium polish.**

All four matter eventually; do not spend a milestone perfecting visual
decoration while core functionality is broken, and do not ship
functionality with placeholder-quality UI and call it done.

## Canny reference rule / boundaries

This project intentionally reproduces the proven Canny-style SaaS
*business mechanism* (Constitution Rule 1). Studying publicly
accessible Canny product behavior and publicly documented functionality
to understand the category is permitted. Reproducing their exact UI,
layout, visual identity, text, icons, branding, or any copyrighted
material is not (Constitution Rule 2). Functional inspiration is
permitted; implementation and presentation must be ours, and the
product should ultimately carry a stronger visual identity of its own
than a copy ever could.

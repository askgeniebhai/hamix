# Engineering Principles — Reuse & Token Discipline

**Status:** Permanent directive from the Product Owner, recorded
2026-08-29 (`DECISIONS.md` D0-005). Applies to all `feedback/**` work
from the next approved milestone onward. Referenced by
[`PROJECT_CONSTITUTION.md`](../PROJECT_CONSTITUTION.md) Rule 11.

## 1. Prefer mature public resources over custom code

Before writing a significant amount of original code, first check
whether a mature, reputable, actively maintained public/open-source
solution already solves the requirement: libraries, frameworks, public
APIs (where licensing permits), official SDKs, reusable packages,
component libraries, validation/auth libraries, database tooling, test
frameworks, migration tools, charting/icon libraries, accessibility
utilities.

Do not hand-roll commodity functionality — a date picker, modal
system, form validator, auth primitive, cryptographic implementation,
table framework, charting engine, markdown parser, rich-text editor,
test framework — when a suitable mature solution exists. Concentrate
custom engineering effort on what creates this product's actual
business value: the feedback workflow, the customer/tenant model,
prioritization, tracked-user economics, feedback intelligence,
commercial intelligence, and product decisions. Everything else is
plumbing — reuse it.

## 2. Workflow: discover → inspect → reuse → configure → integrate

Prefer that sequence over generating everything from scratch. Use
available tools deliberately before spending large reasoning budgets
from memory:

- Repository inspection, code search, dependency research — use the
  project's own tooling and any available MCP servers/agent tools
  rather than guessing.
- Documentation lookup — prefer official docs over generated
  explanations; verify facts against the authoritative source instead
  of reasoning from training-data memory when a reliable source is one
  lookup away.
- Package/library research — check maintenance activity, adoption,
  and security history before adopting.

Search or inspect first when the facts are obtainable; guess only when
they genuinely aren't.

## 3. Dependencies must justify themselves

"Reuse aggressively" is not "install everything." Before adding an
important dependency, weigh:

- maintenance activity and release cadence
- license compatibility with commercial SaaS use
- security history / known vulnerabilities
- popularity and community adoption
- bundle size / runtime cost
- size of its own dependency tree
- compatibility with the chosen stack
- long-term support outlook
- whether the framework already does this natively

Avoid abandoned or suspicious packages. Avoid pulling in a dependency
for something that can be written correctly and safely in a few lines.
The goal is intelligent reuse, not dependency bloat.

## 4. License discipline

Only use resources whose licenses permit this product's intended
commercial SaaS use. Record significant third-party dependencies and
their licenses (a running list belongs in `docs/` once dependencies
exist — e.g. `docs/THIRD_PARTY_LICENSES.md`, created when the first
dependency is added).

Never copy proprietary competitor code, paid themes without a license,
copyrighted assets, proprietary icon sets, proprietary fonts without
appropriate rights, or any competitor's source/CSS/page markup. See
Constitution Rule 2 (Original Implementation) and
[`DESIGN_PRINCIPLES.md`](./DESIGN_PRINCIPLES.md) §"Canny reference
rule" — this applies to design inspiration exactly as it applies to
code.

## 5. Priority order when a milestone starts

For every future milestone, ask in order:

1. **Is there a mature public resource that accomplishes this safely
   with less custom code?** If yes, evaluate and reuse it.
2. **Is this piece part of our real competitive/business value?** If
   yes, it earns full custom engineering attention regardless of (1).

The objective is not to maximize lines of code written. It is a
smaller, smarter, higher-quality commercial SaaS product built with
the available technology used intelligently — see Constitution Rule 6
(Reuse Before Rewrite), which this document makes concrete.

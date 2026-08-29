# Project Constitution

These rules are permanent. They apply to every milestone, every
contributor (human or AI), and every line of code in `feedback/**`.
Changes to this document itself must go through a Pull Request and be
recorded in [`DECISIONS.md`](./DECISIONS.md).

## 1. Business First

Every feature must contribute toward creating a commercially viable
recurring SaaS business: acquisition, activation, retention, expansion,
or monetization. Work that does not serve one of these is out of scope
until justified.

## 2. Original Implementation

Never copy proprietary competitor source code, proprietary algorithms,
exact UI, copyrighted text, branding, logos, trademarks, proprietary
assets, internal APIs, or proprietary documentation. We reproduce the
proven *product category and business model* (feedback → engagement →
subscription → expansion), not any company's specific implementation.
All software here is independently designed and written.

## 3. Understand Before Building

Study the relevant existing code and documentation before modifying it.
Do not change what you have not read.

## 4. Small, Controlled Milestones

Only one authorized milestone is in progress at a time. A milestone is
not started until the previous one is reported complete and the Product
Owner authorizes the next one.

## 5. No Feature Creep

Do not invent functionality that was not requested for the current
milestone, however small or "obviously needed" it seems.

## 6. Reuse Before Rewrite

Do not replace stable, working code without a documented, justified
reason. Prefer extending or reusing existing structure.

## 7. Complete Workflows

A UI appearing on screen is not a finished feature. Where applicable:

- buttons must function,
- forms must validate,
- APIs must function,
- data must persist,
- authorization must work,
- errors must be handled,
- the workflow must work end-to-end, not just in isolation.

## 8. Security by Default

- No secrets are ever committed to the repository.
- Secrets are supplied through environment variables or a secret
  manager, never hardcoded.
- Dependencies are reviewed before being added.
- Least privilege is applied to every credential, token, and CI
  permission.
- Tenant isolation is enforced at the data-access layer once
  multi-tenant data exists.
- Sessions and cookies are handled securely.
- Failure modes are safe by default (deny, not allow, on error).

Full detail lives in [`SECURITY.md`](./SECURITY.md).

## 9. Evidence-Based Completion

Never claim a feature, milestone, or fix is "complete", "working",
"production-ready", "tested", or "secure" without supporting validation
evidence recorded in `feedback/validation/reports/`. An assertion without
evidence is treated as false.

## 10. Main Must Stay Stable

Broken code never merges into `main`. Red CI blocks merge, without
exception — see the CI rules in [`VALIDATION.md`](./VALIDATION.md).

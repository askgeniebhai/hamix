# HAMIX Execution Plan

This plan follows `HAMIX_CONSTITUTION.md` and prioritizes verified defects. Work must proceed milestone by milestone; do not combine unrelated milestones in one implementation commit.

## Milestone 1 — Establish production access boundary

- Objective: Prevent unauthenticated production access to HAMIX business data and actions.
- Scope: Auth/session design, protected app entry, login/logout/session persistence, route guard, demo-mode separation if needed.
- Affected files/modules: `platform/index.html`, `platform/app.js`, new or existing auth service/API modules depending on approved backend approach.
- Dependencies: Product decision on auth provider/backend hosting; database choice if server sessions are required.
- Acceptance criteria: Unauthenticated users cannot access CRM data/actions; authenticated users can login/logout; sessions expire safely.
- Verification steps: login/logout tests, direct URL access test, session-expiry test, browser storage inspection.
- Rollback method: Revert auth milestone commit and restore static platform entry.
- Risk: High; changes platform access model.

## Milestone 2 — Tenant-scoped durable persistence

- Objective: Replace production localStorage-only core data with durable tenant-scoped persistence.
- Scope: Lead, customer, campaign, proposal/project/deployment foundations; tenant IDs; migration/import path for existing local demo data.
- Affected files/modules: storage/DAL services, platform services, future backend/API/database schema.
- Dependencies: Milestone 1 and approved database/backend.
- Acceptance criteria: Core CRUD persists in database and is scoped by tenant/user permissions.
- Verification steps: create/edit/delete records, reload, different browser/device check, cross-tenant denial tests.
- Rollback method: Feature flag back to local demo mode, revert persistence commit, preserve migration backup.
- Risk: High; touches all business entities.

## Milestone 3 — Connect lead discovery, qualification, and sales pipeline end to end

- Objective: Make lead capture/import, dedupe, qualification, status transitions, and conversion reliable.
- Scope: Lead forms/import validation, duplicate handling, status transition history, customer conversion guard.
- Affected files/modules: LeadEngine, PipelineService, AcquisitionService, Leads UI, Customers UI, persistence APIs.
- Dependencies: Milestones 1-2.
- Acceptance criteria: Manual/CSV/GMaps leads persist, validate, dedupe, qualify, move through statuses, and convert once to customer.
- Verification steps: manual lead test, CSV import, GMaps paste import, duplicate test, conversion test, reload persistence test.
- Rollback method: Revert milestone commit; database migration rollback if schema changed.
- Risk: Medium/high.

## Milestone 4 — Implement proposal and project transition foundations

- Objective: Fill the lifecycle gap from AI business analysis to proposal and project discovery.
- Scope: Proposal entity, proposal creation from qualified lead/customer, approval status, project discovery record.
- Affected files/modules: New/existing proposal/project modules, platform navigation, persistence APIs.
- Dependencies: Milestones 1-3.
- Acceptance criteria: Qualified lead/customer can produce, save, edit, approve, and convert proposal into project discovery.
- Verification steps: end-to-end lead-to-proposal-to-project test with permission and persistence checks.
- Rollback method: Revert proposal/project commit and schema migration.
- Risk: Medium.

## Milestone 5 — Connect AI website generation and deployment operations

- Objective: Turn existing generation/deployment helpers into a visible, verifiable workflow.
- Scope: Customer project inputs, generated site preview/versioning, Deployments page connected to queue/logs/retry, credential error states.
- Affected files/modules: generator, operations manager, modals, customers/deployments pages.
- Dependencies: Milestones 1-4; GitHub/deployment credentials.
- Acceptance criteria: Project generates preview, saves version, queues deployment, shows logs/status, handles failure/retry.
- Verification steps: generate preview, publish with test credentials, inspect deployed artifact, retry failed job.
- Rollback method: Revert milestone commit; keep previous generated customer records.
- Risk: Medium/high due external integration.

## Milestone 6 — Repair navigation, dead CTAs, placeholders, and user feedback states

- Objective: Remove or connect dead public/internal navigation and primary actions.
- Scope: Navbar/footer anchors, Book Demo flow, See How It Works, Templates/Settings placeholders, loading/empty/error/success states.
- Affected files/modules: `website/src/components/*`, `platform/index.html`, `platform/app.js`, CSS/theme tokens.
- Dependencies: Product-approved destinations for demo/contact and settings/templates scope.
- Acceptance criteria: Every visible primary link/button either works or is clearly disabled/coming soon; no fake success states.
- Verification steps: click map for header/footer/sidebar/buttons and browser console/network checks.
- Rollback method: Revert milestone commit.
- Risk: Low/medium.

## Milestone 7 — Business growth and operating-system modules

- Objective: Make campaigns/customer success/attendance/payroll either real scoped workflows or clearly non-production previews.
- Scope: WhatsApp provider integration or approval/export path; support/customer success records; attendance/payroll persistence and permissions or nav demotion.
- Affected files/modules: CampaignService, campaign UI, attendance/payroll pages, settings.
- Dependencies: Milestones 1-2 and integration credentials.
- Acceptance criteria: Sensitive workflows persist securely and enforce permissions, or are not presented as production-ready.
- Verification steps: campaign send/export test, opt-out/error states, attendance/payroll CRUD permission tests.
- Rollback method: Revert milestone commit.
- Risk: Medium.

## Milestone 8 — Deployment documentation, responsive QA, accessibility, and visual consistency

- Objective: Complete production-readiness checks and consistent design system refinements.
- Scope: `.env.example`, deployment docs, build/runtime checks, desktop/tablet/mobile verification, color tokens, contrast/accessibility improvements.
- Affected files/modules: docs, website CSS/components, platform CSS/components.
- Dependencies: All core workflow milestones.
- Acceptance criteria: Fresh clone can be configured from docs; production build/runtime passes; key pages verified responsive and accessible.
- Verification steps: dependency install, lint, type/build, runtime browser console/network, responsive screenshots, deployment checklist.
- Rollback method: Revert documentation/theme commit.
- Risk: Low/medium.

## Completed milestone note — Proposal, quotation and onboarding

- Proposal persistence, proposal numbering, status transitions, revision history, print-ready output, accepted-proposal conversion, project creation/enrichment, and project discovery persistence are implemented in the current backend foundation.
- External dependencies remain for real email delivery, PDF generation beyond browser print, customer e-signature, object storage, and secure credential vaulting.

## Completed milestone note — AI business diagnostic flow

- Workspace-scoped diagnostic persistence, review state, proposal guidance, and diagnostic-to-proposal linkage are implemented.
- External AI provider selection, prompt governance, model credentials, and production AI monitoring remain future Product Owner/infrastructure decisions.

## Completed milestone note — AI diagnostic hardening

- Diagnostic input persistence, review/edit state, approval gating, diagnostic-to-proposal audit linkage, and invalid-input handling are implemented.

## Completed Milestone: Project Discovery and Asset Metadata

- Objective: connect existing onboarding/project discovery flow to persistent backend storage without inventing a new project-management platform.
- Scope completed: project list/detail/update APIs, discovery persistence, project status updates, metadata-only asset tracking, tenant isolation, audit logging, frontend Projects navigation and controls.
- Verification: backend syntax, frontend syntax, API lifecycle smoke tests, backend restart persistence, cross-tenant read/update rejection, lint/build checks, and git diff checks.
- Rollback: revert this milestone commit to remove project/asset endpoints and Projects UI while preserving previously accepted auth/lead/proposal/diagnostic schema.
- Remaining blockers: durable object storage and secure secret storage/provider selection are external deployment decisions.

## Completed Milestone: Website Generation Engine

- Objective: connect approved onboarding discovery to a persistent website-generation project without faking AI output.
- Scope completed: website project schema, version schema, create/list/detail/edit/status/version APIs, duplicate prevention, regeneration/versioning, frontend Websites page/actions, audit logging, and documentation.
- Verification: creation, duplicate prevention, regeneration/version history, backend restart persistence, project linkage, cross-tenant rejection, syntax checks, lint/build checks, and clean tree checks.
- Rollback: revert this milestone commit to remove website project endpoints/UI while preserving accepted onboarding and proposal data.
- Remaining blockers: external AI provider configuration, prompt/model governance, and the upcoming website deployment provider workflow.

## Completed Milestone: Website Deployment Workflow

- Objective: persist deployment requests for approved website projects without simulating deployment provider success.
- Scope completed: deployment schema, list/create/detail/status APIs, duplicate pending deployment prevention, provider-missing status, frontend request/list/cancel controls, audit logging, and documentation.
- Verification: approved website deployment request, unapproved rejection, duplicate prevention, backend restart persistence, cross-tenant rejection, syntax checks, lint/build checks, and clean tree checks.
- Remaining blockers: deployment provider selection, target repository/hosting configuration, DNS/domain credentials, and secret storage.

## Completed Milestone: Customer Success Workflow

- Objective: connect customer/project handoff to persistent customer success without faking external automation providers.
- Scope completed: success record schema, activity schema, tenant-scoped APIs, duplicate prevention, support/activity history, provider-block validation, frontend Customer Success page/actions, audit logging, and documentation.
- Verification: creation/update, duplicate prevention, invalid input/provider rejection, activity persistence, backend restart persistence, customer/project linkage, cross-tenant rejection, syntax checks, lint/build checks, and clean tree checks.
- Remaining blockers: email, SMS, monitoring, analytics, customer feedback collection, and SLA automation providers require selection/configuration.

## Completed Milestone: Navigation, Lint, Responsive, Accessibility, and Visual-System Cleanup

- Objective: remove known lint defect, reduce dead placeholder navigation, and apply a restrained consistent HAMIX visual system.
- Scope completed: removed unused `clsx` import, replaced Templates/Settings placeholders with useful state/dependency content, added shared platform colour tokens, focus-visible states, table overflow protection, and tablet/mobile responsive rules.
- Verification: JavaScript syntax checks, website lint, production build, diff check, and clean tree check.
- Remaining blocker: browser screenshot/responsive visual verification requires an installed browser runtime.

## Completed Milestone: Platform Integration

- Objective: connect accepted HAMIX modules into one end-to-end lifecycle without redesign or fake provider behavior.
- Scope completed: cross-module lead actions, dashboard lifecycle stats, global entity search, customer filtering, static navigation/page reachability verification, full API journey verification, backend restart persistence, and tenant-isolation verification.
- Verification: full Lead Discovery → Customer Success API journey, major CRUD/list checks, duplicate/idempotency checks, invalid/provider-action checks, direct cross-tenant attack checks, backend restart persistence, page reachability check, syntax checks, lint, production build, diff check, and clean tree check.
- Remaining blockers: external AI provider, deployment provider/target, object storage, email/SMS/monitoring/analytics/feedback providers, secret storage, browser runtime for console/screenshot verification, and Git remote restoration.

## Completed Milestone: Production Hardening

- Objective: close repository-controlled production gaps without adding new business modules.
- Scope completed: RBAC, security/CORS headers, rate limiting, malformed JSON handling, structured logs, health/readiness/provider checks, provider-block policy, automated lifecycle/cross-tenant integration test, environment documentation, and SQLite backup/restore guidance.
- Verification: role/permission checks, auth/session checks, full lifecycle integration, cross-tenant attacks, invalid input/provider blocking, restart persistence, health/readiness checks, lint, production build, diff check, and clean tree check.
- Remaining blockers: external providers, production HTTPS/reverse proxy, backup storage/retention, secret management, browser runtime, deployment infrastructure, and Git remote restoration.

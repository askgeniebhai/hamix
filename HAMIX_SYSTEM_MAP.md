# HAMIX System Map

## Investigation snapshot

- Branch: `work`.
- Latest pre-change commit inspected for this map: `bc8dc92 Document HAMIX audit governance blocker`.
- Working tree before this documentation update: clean.
- Constitution authority: `HAMIX_CONSTITUTION.md` v1.0 is now present at repository root.

## Repository structure and stack

| Area | Actual implementation | Classification |
| --- | --- | --- |
| `website/` | React 19 + Vite marketing website with Tailwind v4 theme tokens and component sections. | Partially functional frontend-only public site. |
| `platform/` | Static HTML/CSS/vanilla JavaScript CRM-style app using browser globals and localStorage services. | Partially functional client-only app. |
| `platform/services/` | Acquisition, campaign, pipeline, and storage services. | Functional locally, disconnected from server persistence. |
| `platform/operations/` | Local DAL, admin helpers, and deployment manager. | Partially functional; includes mock user and simulated operations. |
| `platform/generator/` | Customer website generation and deployment helper modules. | Partially functional; deployment requires external configuration and verification. |
| `platform/ai/` | Deterministic AI-style customer analysis/content helper. | Mocked/local AI; no live provider connection observed. |
| `docs/` | Roadmap and stabilization reports. | Documentation only; some statements require re-verification against code. |
| `nsf/` | Separate National Security Force static project. | Out of HAMIX platform scope per roadmap unless explicitly directed. |

## Architecture map

- Public website: `website/src/main.jsx` renders `App.jsx`, which composes Navbar, Hero, Platform, Solutions, Trust, CTA, and Footer components.
- Authenticated/internal app: `platform/index.html` loads plain scripts for services, generation, operations, modals, and `app.js`.
- Persistence: local browser storage via `platform/services/StorageService.js` and `platform/operations/dal.js`; no backend database is present.
- Authentication/session: no verified login, registration, logout, password reset, or session layer exists in HAMIX platform code.
- Authorization/tenant isolation: no verified user, role, permission, organization, or tenant boundary enforcement exists.
- API routes: no server-side API route implementation found; operations are local browser calls.
- Integrations: Google Maps import is parser-based from pasted content; CSV import is client-side; AI processing is deterministic/mock; GitHub deployment is queued/simulated unless external configuration is supplied.
- Environment/deployment: website has Vite build scripts; static root and platform are deployable as static assets; no environment-variable contract was found for production integrations.

## Business lifecycle support

| HAMIX phase | Pages/components | APIs/services/entities | Current status | Missing connection or risk |
| --- | --- | --- | --- | --- |
| Lead Discovery | Landing page CTA, platform Leads page, import modal. | AcquisitionService, LeadEngine, StorageService/DAL lead arrays. | Partially functional. | Imports are client-only; no authenticated source connectors or durable backend storage. |
| Lead Qualification | Leads table filters/statuses, PipelineService scoring/deduplication. | Lead status, opportunity score, validation warnings. | Partially functional. | No human approval workflow enforcement, audit trail, tenant boundary, or server persistence. |
| Sales Pipeline | Lead statuses and dashboard approved-lead count. | PipelineService and lead status values. | Partially functional. | No dedicated pipeline board, permissions, or persisted status transition history. |
| AI Business Analysis | AI engine and generated content fields. | `platform/ai/engine.js`, PipelineService score/profile helpers. | Mocked/local. | No live AI provider, prompt governance, human approval state, or error handling for provider failures. |
| Proposal Generation | No verified proposal page or proposal entity. | None found. | Missing. | Business lifecycle transition from analysis to proposal is not implemented. |
| Customer Conversion | Lead edit status conversion creates customers. | LeadEngine.createCustomer, customer localStorage. | Partially functional. | Duplicate customer risk; conversion is local and lacks authorization/history. |
| Project Discovery | Customer operations/review modals. | Customer website config objects. | Partially functional. | Discovery inputs are not formalized or persisted server-side. |
| AI Website Generation | Customer page/generator services. | generator engine/templates/components/themes. | Partially functional. | Generated sites are local; generation acceptance and versioning need verification. |
| Deployment | Deployments page placeholder, Operations manager queue. | deployment manager and deployment helper. | Disconnected/partial. | Sidebar page is placeholder; credentials/config and live publishing are not verified. |
| Customer Success | Customer management page and operations modal. | Customer records and history arrays. | Partially functional. | No support tickets, success tasks, subscriptions, or tenant-safe customer portal. |
| Business Growth | Campaigns page and WhatsApp message generation. | CampaignService, campaign localStorage. | Partially functional. | No real WhatsApp API, scheduling, opt-out, compliance, or campaign analytics. |
| Business Operating System | Attendance/payroll static sections. | Static UI only. | Frontend only/disconnected. | No payroll/attendance persistence, permissions, or business OS backend. |

## Module classification

| Module | Classification | Evidence summary |
| --- | --- | --- |
| Public marketing website | Partially functional | Vite React app builds sections, but Pricing/About/Contact anchors have no matching sections and demo CTA has no form/action. |
| HAMIX CRM dashboard | Partially functional | Dashboard reads local leads/customers/campaigns but has no backend or auth guard. |
| Lead management | Partially functional | Add/edit/import flows exist with localStorage persistence; no server validation or tenancy. |
| Campaigns | Partially functional/mocked | Campaign generation exists locally; no WhatsApp provider integration. |
| Customers | Partially functional | Customer conversion and generation actions exist locally; deployment not proven live. |
| Templates | Frontend only | Sidebar route renders placeholder heading only. |
| GitHub Deployments | Disconnected | Sidebar route renders placeholder heading while operation queue exists elsewhere. |
| Settings | Frontend only | Sidebar route renders placeholder heading only. |
| Attendance | Frontend only | Static table/cards with no connected persistence. |
| Payroll | Frontend only | Static table/cards with no connected persistence. |
| Authentication | Missing | No login/registration/session implementation found in HAMIX platform. |
| Authorization and tenant isolation | Missing | No roles/permissions/tenant filters found. |
| Backend/API/database | Missing | No server API or database layer found for HAMIX; data uses localStorage. |

## Lead lifecycle implementation update

- The current backend foundation now supports server-side lead import, qualification, pipeline-stage changes, activity history, and conversion through protected API endpoints.
- Lead import enforces the outreach-ready contact rule by skipping no-phone listings and landline/non-mobile records, normalizing valid Indian mobile numbers to E.164, and storing separate mobile/WhatsApp eligibility/verification/consent fields.
- Duplicate lead prevention is enforced per workspace with normalized mobile, normalized email, source key, and business-name-plus-address identity indexes.
- Lead conversion marks the source lead as `Customer` / `Won`, returns existing converted customers on repeat conversion, stores `sourceLeadId`, writes audit entries, and creates a minimum onboarding project record where the backend schema now supports it.

## Proposal, quotation and onboarding implementation update

- Existing proposal/quotation capability was previously absent except for pricing text on the landing page and lead/customer conversion foundations.
- The backend now supports workspace-scoped proposals, server-generated proposal numbers, line-item total validation, proposal versions/events, print-ready HTML output, accepted-proposal customer conversion, project enrichment/creation, and project discovery persistence.
- Email sending remains an external provider dependency; the implemented flow records a manual `Sent` state rather than pretending to send email.
- PDF generation, customer e-signature, durable object storage for uploads, and secure credential vaulting remain external infrastructure/product decisions.

## AI business diagnostic implementation update

- The backend now supports workspace-scoped business diagnostics for leads or customers, with verified information, inferred findings, recommendations, estimates, unavailable-data tracking, review state, and proposal-drafting guidance.
- Diagnostics can inform proposal drafting through `diagnosticId`, but generated guidance remains labelled as deterministic HAMIX estimates requiring user review.
- No external AI provider is configured; this milestone intentionally does not claim live AI or autonomous commercial decision-making.

## AI diagnostic hardening update

- Diagnostic records now include user-provided goals/constraints inputs, editable reviewed recommendations, approved timestamp/user metadata, and an approval gate before diagnostic output can draft a proposal.

## Project Discovery & Asset Milestone Update

- Project onboarding records are now first-class server entities exposed through `/api/projects` and `/api/projects/:id`; they remain idempotent by workspace/customer so repeated lead conversion or accepted-proposal retries do not create duplicate onboarding projects.
- Discovery data is persisted through `/api/projects/:id/discovery` and linked to the authenticated workspace, project, customer, source lead, and accepted proposal already stored on the project record.
- Captured discovery fields include company profile, contacts, products, services, target audience, competitors, brand details, domain/current website, content status, technical requirements, notes, and project/discovery status.
- Asset handling is metadata-only because this checkout has no durable object-storage provider; `/api/projects/:id/assets` validates metadata, rejects inline file bytes/base64 payloads, records `metadata_only` status, and audit logs the action.
- Frontend navigation now includes a Projects page for onboarding discovery, status updates, and asset metadata capture through the shared `StorageService`/`ApiService` path.

## Website Generation Engine Milestone Update

- Website generation is now represented by persistent `website_projects` and `website_project_versions` records linked to workspace, onboarding project, customer, and accepted proposal.
- `/api/websites` creates one website project per onboarding project; repeat create requests return the existing website project, while explicit regeneration creates a new preserved version.
- Because no external AI provider is configured in this checkout, generation requests are saved with `Pending AI Provider` rather than fake generated website content.
- Stored website-generation request data includes pages, sitemap, navigation, branding, palette, typography, sections, prompts, discovery snapshot, generation status, timestamps, and version history.
- Frontend Websites navigation uses shared services to create generation requests, request regenerations, inspect version history, and approve internal website project records.

## Website Deployment Workflow Milestone Update

- Website deployment is now represented by persistent `website_deployments` records linked to workspace, approved website project, onboarding project, customer, and website version.
- `/api/deployments` creates deployment requests only for approved website projects and records `Pending Deployment Provider` when no deployment provider/target is configured.
- Duplicate pending deployment requests for the same website version are prevented; cancellation is supported and audited.
- Frontend deployment navigation now lists deployment requests and supports request/cancel/refresh through shared services.

## Customer Success Workflow Milestone Update

- Customer success is now represented by persistent `customer_success_records` and `customer_success_activities` linked to workspace, customer, project, proposal, website project, and deployment where available.
- `/api/customer-success` creates one record per workspace/customer/project, returns existing records on duplicates, and stores onboarding completion, project status, support issues, follow-ups, renewal data, growth opportunities, satisfaction, next actions, provider blocks, and notes.
- `/api/customer-success/:id/activities` persists manual support/activity history while rejecting provider-dependent actions such as email, SMS, monitoring alerts, analytics reports, and feedback requests until providers are configured.
- Frontend Customer Success navigation provides create, update, activity history, refresh, empty-state, and provider-block messaging through shared service methods.

## Navigation, Responsive, Accessibility, and Visual-System Cleanup

- The public landing page and internal platform now share a restrained HAMIX visual direction based on navy structure, indigo primary actions, teal success/accent, neutral surfaces, visible focus states, and responsive layout safeguards.
- Templates and Settings pages are no longer empty placeholders; they document current repository-supported capabilities and external provider dependencies.
- The website app lint warning in `Button.jsx` is resolved.

## Platform Integration Milestone Update

- The completed modules are now connected into one navigable lifecycle: Lead Discovery → Lead Qualification → AI Business Diagnostic → Proposal → Customer Conversion → Project Discovery → Website Generation → Website Deployment → Customer Success.
- Lead rows now provide direct diagnostic and proposal actions, dashboard lifecycle statistics include diagnostics/proposals/projects/websites/deployments/customer-success, and global search spans the major persisted entities.
- Customer filtering now applies to the customer table, and all sidebar navigation entries were statically verified to have matching page containers.
- Cross-module data remains server-authenticated and tenant-scoped through the existing service/API architecture; provider-dependent AI/deployment/customer-success actions continue to be marked pending or blocked rather than faked.

# HAMIX Production Setup Checklist

This checklist records the external infrastructure and Product Owner decisions required before HAMIX RC1 can be promoted from repository-controlled release candidate to production launch.

## Git Publishing and Release Control

- [ ] Confirm canonical Git hosting provider and repository URL.
- [ ] Configure the correct `origin` remote in this checkout.
- [ ] Verify repository identity before push: `git remote -v`, `git branch -vv`, and latest commit hash.
- [ ] Push branch `work` without force-push.
- [ ] Open RC1 pull request from `work` to the approved base branch.
- [ ] Record PR number, PR URL, base branch, head branch, and hosted check status.
- [ ] Do not merge until hosted checks pass and Product Owner review is complete.

Current blocker: this checkout has no Git remote configured, so branch `work` cannot be pushed and hosted PR status cannot be verified from this environment.

## HTTPS / Reverse Proxy

- [ ] Select production hostname(s).
- [ ] Configure HTTPS certificates.
- [ ] Put the Node backend behind a reverse proxy.
- [ ] Preserve HTTP-only session cookies through the proxy.
- [ ] Set `NODE_ENV=production`.
- [ ] Set `HAMIX_COOKIE_SECURE=true`.
- [ ] Set `HAMIX_ALLOWED_ORIGIN` to the public HTTPS origin.
- [ ] Configure request/body limits, access logs, and basic WAF/rate-limit controls at the edge.

## Secret Storage

- [ ] Select approved secret-storage provider.
- [ ] Configure `HAMIX_SECRET_PROVIDER`.
- [ ] Move production credentials out of browser notes, docs, and ordinary database fields.
- [ ] Define secret rotation procedure.
- [ ] Define break-glass access procedure.

## AI Provider

- [ ] Select approved AI provider/model(s).
- [ ] Configure `HAMIX_AI_PROVIDER`.
- [ ] Configure `HAMIX_AI_API_KEY` through secret storage.
- [ ] Approve prompt governance and review policy.
- [ ] Approve cost controls and usage limits.
- [ ] Define monitoring for model failures, latency, and unsafe output.

## Website Deployment Provider and Target

- [ ] Select deployment provider.
- [ ] Configure `HAMIX_DEPLOYMENT_PROVIDER`.
- [ ] Configure `HAMIX_DEPLOYMENT_TARGET`.
- [ ] Approve target repository/hosting model.
- [ ] Configure deployment credentials through secret storage.
- [ ] Define rollback procedure.
- [ ] Define provider-specific idempotency and webhook validation.

## DNS / Domain Access

- [ ] Confirm DNS provider.
- [ ] Confirm who owns customer-domain access.
- [ ] Define process for domain verification and DNS changes.
- [ ] Define SSL issuance/renewal ownership.
- [ ] Define customer approval process for domain cutover.

## Object Storage

- [ ] Select object-storage provider.
- [ ] Configure `HAMIX_STORAGE_PROVIDER`.
- [ ] Configure `HAMIX_STORAGE_BUCKET`.
- [ ] Define tenant-scoped object key strategy.
- [ ] Define file type and size policies.
- [ ] Define malware scanning and retention policy.
- [ ] Configure private access and signed URL policy.

## Email

- [ ] Select email provider.
- [ ] Configure `HAMIX_EMAIL_PROVIDER`.
- [ ] Configure `HAMIX_EMAIL_API_KEY` through secret storage.
- [ ] Configure sending domain, SPF, DKIM, and DMARC.
- [ ] Define templates and opt-out policy.
- [ ] Define bounce/failure handling.

## SMS / WhatsApp

- [ ] Select SMS/WhatsApp provider.
- [ ] Configure `HAMIX_SMS_PROVIDER`.
- [ ] Configure `HAMIX_SMS_API_KEY` through secret storage.
- [ ] Approve consent policy.
- [ ] Approve WhatsApp verification policy.
- [ ] Define delivery failure handling and rate limits.

## Monitoring

- [ ] Select monitoring provider.
- [ ] Configure `HAMIX_MONITORING_PROVIDER`.
- [ ] Capture backend uptime, errors, latency, and resource usage.
- [ ] Capture deployment workflow failures.
- [ ] Define alert routing and severity policy.
- [ ] Define incident response process.

## Analytics

- [ ] Select analytics provider.
- [ ] Configure `HAMIX_ANALYTICS_PROVIDER`.
- [ ] Define tenant/customer data boundaries.
- [ ] Approve privacy policy and tracking consent requirements.
- [ ] Define dashboards for lifecycle conversion and customer success.

## Customer Feedback

- [ ] Select customer-feedback provider or approved manual workflow.
- [ ] Define satisfaction survey timing and content.
- [ ] Define feedback ownership and escalation path.
- [ ] Define how feedback links to customer-success records.

## Backups and Restore Drills

- [ ] Set `HAMIX_DB_PATH` to a persistent production volume.
- [ ] Select backup storage location.
- [ ] Schedule SQLite backups using `.backup`.
- [ ] Run `PRAGMA integrity_check` after backups.
- [ ] Define retention policy.
- [ ] Perform restore drill before production launch.
- [ ] Document rollback procedure and owner.

## Browser-Based Responsive and Console QA

- [ ] Install/enable browser automation runtime in CI.
- [ ] Verify login/register/logout/session reload in browser.
- [ ] Verify full lifecycle journey in browser.
- [ ] Verify desktop viewport.
- [ ] Verify tablet viewport.
- [ ] Verify mobile viewport.
- [ ] Verify browser console has no application errors.
- [ ] Verify network requests use backend APIs and fail safely.
- [ ] Capture screenshots for public landing page and internal platform pages.

## Product Owner Decisions Required

- Canonical Git remote URL and approved base branch.
- Production domain(s) and DNS owner.
- AI provider/model and budget.
- Deployment provider/target.
- Object-storage provider.
- Email provider and sending domain.
- SMS/WhatsApp provider and consent policy.
- Monitoring/analytics/feedback provider choices.
- Secret-storage provider.
- Backup retention policy and restore owner.
- Approval to proceed from RC1 review to production launch after hosted checks and browser QA pass.

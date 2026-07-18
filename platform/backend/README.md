# HAMIX Backend Foundation

Minimal Node.js backend for the existing static HAMIX platform.

## Local development

```bash
cp platform/backend/.env.example platform/backend/.env
HAMIX_SESSION_SECRET=dev-secret-change-me node platform/backend/server.js
```

Open `http://localhost:8787/platform/index.html`.

## Production notes

- Set `HAMIX_SESSION_SECRET` to a long random secret.
- Set `HAMIX_COOKIE_SECURE=true` behind HTTPS.
- Set `HAMIX_DB_PATH` to a persistent volume.
- Do not use the client local auth fallback for production data.

## Project discovery and asset metadata

The backend exposes tenant-scoped project onboarding APIs at `/api/projects`, `/api/projects/:id`, `/api/projects/:id/discovery`, and `/api/projects/:id/assets`.

Asset handling is metadata-only in this repository checkout. The API validates file name, MIME type, and size, records `storageStatus: metadata_only`, and rejects inline file bytes/base64 payloads because no durable object-storage provider is configured. Configure an approved object-storage service before handling production customer files.

Discovery notes and asset metadata must not contain passwords, tokens, API keys, hosting credentials, or other secrets. A dedicated secret store is required before HAMIX can collect deployment credentials.

## Website generation engine

Website-generation requests are stored through `/api/websites` and linked to onboarding projects. The database allows one website project per workspace/project and stores regeneration requests as new versions.

If `HAMIX_AI_PROVIDER` and `HAMIX_AI_API_KEY` are not configured, the backend records website projects as `Pending AI Provider` and does not fabricate generated content. Configure an approved AI provider and review prompt/model governance before enabling generated website content.

## Website deployment workflow

Deployment requests are stored through `/api/deployments` and require an approved website project. If `HAMIX_DEPLOYMENT_PROVIDER` and `HAMIX_DEPLOYMENT_TARGET` are not configured, requests are saved as `Pending Deployment Provider` and no publishing is simulated.

Configure approved hosting/repository targets, DNS/domain access, and secure secret storage before enabling real website publishing.

## Customer success workflow

Customer-success records are stored through `/api/customer-success` and linked to customer, project, proposal, website project, and deployment data inside the authenticated workspace. Activity history is stored through `/api/customer-success/:id/activities`.

Provider-dependent actions such as email, SMS, monitoring alerts, analytics reports, and customer feedback requests are blocked unless approved providers are configured. HAMIX records manual activity history but does not fake customer communications or monitoring.

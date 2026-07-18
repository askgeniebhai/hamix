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

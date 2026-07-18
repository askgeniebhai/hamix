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

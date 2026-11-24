# Deployment

## Recommended architecture

- **Frontend:** static SPA (Vite build) behind CDN or reverse proxy (nginx, Caddy).
- **Backend:** Node.js process manager (systemd, PM2) or container.
- **PostgreSQL 16** and **Redis 7** as managed services or containers with persistent volumes.
- TLS terminated at the reverse proxy; backend trusts `X-Forwarded-*` only if configured.

Live deployment of this submission is **pending** (no external hosting credentials in this environment). Configuration below is deployment-ready.

## Environment variables (backend)

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | e.g. `3001` |
| `DATABASE_URL` or `PG*` | yes | PostgreSQL connection |
| `REDIS_URL` or `REDIS_HOST`/`PORT` | yes | Redis connection |
| `JWT_SECRET` | yes | ≥32 random characters |
| `FRONTEND_URL` | yes | Exact SPA origin for CORS |
| `COOKIE_SAME_SITE` | recommended | `lax` or `none` (requires Secure) |
| `JWT_EXPIRES_IN` | optional | default `1h` |
| Cache limits | optional | see `.env.example` |

Cookie `Secure` is enabled automatically when `NODE_ENV=production`.

## Environment variables (frontend)

| Variable | Notes |
|----------|-------|
| `VITE_API_URL` | Absolute backend origin in production (e.g. `https://api.example.com`). Empty uses same-origin or Vite proxy in dev. |

## Local (Docker infrastructure)

```bash
docker compose up -d
# wait for healthchecks
docker compose ps

cd backend && cp .env.example .env
# edit JWT_SECRET
npm ci   # or npm install
npm run migrate
npm run start   # or npm run dev

cd ../frontend && cp .env.example .env
npm ci
npm run build && npm run preview
# or npm run dev for development
```

## Production steps (outline)

1. Provision PostgreSQL and Redis; restrict network access.
2. Set secrets via environment or secret manager (never commit `.env`).
3. Run migrations: `NODE_ENV=production npm run migrate`.
4. Start API: `NODE_ENV=production node src/index.js` (or process manager).
5. Build SPA: `VITE_API_URL=https://api.example.com npm run build`.
6. Serve `frontend/dist` with SPA fallback to `index.html`.
7. Configure reverse proxy TLS and forward API paths if same host.
8. Verify `GET /health`, `/health/db`, `/health/redis`.

## Migrations

- SQL files in `backend/src/migrations/`.
- Runner: `npm run migrate` (applies pending files in order).
- Run once per environment before serving traffic.

## Health checks

- `GET /health` — process up.
- `GET /health/db` — PostgreSQL query.
- `GET /health/redis` — `PING`.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| CORS errors | `FRONTEND_URL` matches browser origin exactly |
| Cookie not set | HTTPS + Secure in production; SameSite |
| 401 on dashboard | Cookie domain/path; JWT_SECRET consistency |
| Redis errors | `REDIS_URL`, network, persistence volume |
| Migration failures | DB credentials, existing schema |

## Rollback

- Keep previous app release artifacts.
- Database migrations are forward-only in this project; restore from PostgreSQL backup if a migration must be undone.
- Redis is ephemeral for cache/rate limits; loss does not corrupt account data.

## Security reminders

- Rotate `JWT_SECRET` carefully (invalidates sessions).
- Do not log API key secrets or passwords.
- Use managed TLS certificates.

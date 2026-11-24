# Cache-as-a-Service (CaaS)

Hosted multi-tenant caching and rate-limiting API with a developer dashboard for observability, key management, usage quotas, and integration.

## Problem

Teams need a simple HTTP cache with real TTL, quotas, and visibility into hit rate and latency—without running Redis operations in-house—while keeping tenants and secrets isolated.

## Objectives

- Secure public cache API (`PUT` / `GET` / `DELETE`) with API keys.
- Plan-based rate limits and item caps.
- Dashboard analytics from real event data.
- Safe onboarding and integration testing.
- HCI-aligned destructive actions and accessibility.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router, Tailwind CSS, TanStack Query, Recharts |
| Backend | Node.js, Express, bcrypt, JWT (httpOnly cookie) |
| Database | PostgreSQL 16 |
| Cache / limits | Redis 7 |
| Orchestration | Docker Compose |

## Architecture

See [docs/architecture.md](docs/architecture.md).  
Request path: Browser → Express → PostgreSQL / Redis.  
Dashboard auth: JWT cookie. Public API: `x-api-key` header.

### Redis key strategy (summary)

- `cache:{userId}:{key}` — values + TTL  
- `meta:{userId}` — set of keys; detail hashes for size/created  
- `rl:{userId}:minute` / monthly counters — rate limiting  

### Database

Migrations in `backend/src/migrations/`. Tables include `users`, `plans`, `api_keys`, `usage_events`, `api_request_events`.

## Features

| Area | Description |
|------|-------------|
| Public API | `/v1/cache/:key` with HIT/MISS headers |
| Auth | Signup/login, httpOnly JWT, bcrypt |
| API keys | Hashed storage, one-time secret, revoke |
| Rate limits | Sliding minute window + UTC monthly quota |
| Dashboard | Stats 1h/24h/7d, latency charts |
| Cached Items | Search, sort, TTL edit, delete, clear-all |
| Usage | Live counters matching enforcer |
| Integrate | Snippets + real Test Connection |
| Settings | Account, keys, theme, logout |

## Local setup

```bash
# Infrastructure
docker compose up -d

# Backend
cd backend
cp .env.example .env    # set JWT_SECRET
npm install             # or npm ci when lockfile present
npm run migrate
npm run dev             # http://localhost:3001

# Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev             # http://localhost:5173
```

Health: `GET /health`, `/health/db`, `/health/redis`.

## Environment

- Backend: see `backend/.env.example` (database, Redis, JWT, cookie, CORS, cache limits).
- Frontend: `VITE_API_URL` empty for Vite proxy in dev; absolute API origin in production.

## Tests

```bash
cd backend && npm test
cd frontend && npm test && npm run build
```

Details: [docs/testing.md](docs/testing.md).

## UI design system

The dashboard uses a hybrid layout: a dark sidebar with a light workspace (navy
sidebar, lavender workspace, pastel KPI cards, Plus Jakarta Sans), plus a full dark theme. Design tokens live in `frontend/src/index.css`, and shared
components live in `frontend/src/components/ui/`. Light/Dark/System theming uses
the existing `caas_theme` key, with no flash on load. Navigation adapts from a
persistent sidebar (desktop) to an icon rail (tablet) to a drawer (mobile). See
[docs/design-system.md](docs/design-system.md).

## API documentation

- Dashboard APIs: [docs/dashboard-api.md](docs/dashboard-api.md)
- Public cache: `PUT/GET/DELETE /v1/cache/:key` with body `{ "value", "ttl" }` and header `x-api-key`

## Deployment

[docs/deployment.md](docs/deployment.md) — production env, migrations, health checks.  
**Live deployment status: pending** (configuration ready; no external host in this delivery).

## Security

Passwords bcrypt-hashed; JWT in httpOnly cookies; API keys stored as SHA-256 hashes; revoked keys rejected; rate limits; Helmet; CORS; tenant-scoped data. Never commit real `.env` files.

## HCI

Design follows Nielsen heuristics and Shneiderman rules (status, confirmation, consistency).  
Evaluation templates: [docs/hci-evaluation.md](docs/hci-evaluation.md).  
**Participant SUS / task study: pending.**

## Documentation index

| Doc | Content |
|-----|---------|
| [architecture.md](docs/architecture.md) | Components, flows |
| [deployment.md](docs/deployment.md) | Production readiness |
| [testing.md](docs/testing.md) | Test strategy |
| [hci-evaluation.md](docs/hci-evaluation.md) | Heuristics, tasks, SUS template |
| [final-project-report.md](docs/final-project-report.md) | Full report |
| [dashboard-api.md](docs/dashboard-api.md) | Dashboard HTTP API |
| [design-system.md](docs/design-system.md) | UI tokens, components, theming, responsive navigation |

## Known limitations

- No password reset, email change, or MFA.
- Theme preference is browser local only.
- Large frontend JS bundle (Recharts).
- No automated browser E2E in this environment.
- Formal HCI participant study not run here.

## License / submission

Academic / project submission artifact. Exclude secrets from distribution archives.

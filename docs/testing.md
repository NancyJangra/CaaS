# Testing

## Strategy

| Layer | Tool | Scope |
|-------|------|--------|
| Backend unit/integration | Jest + Supertest | Auth, cache, rate limit, dashboard APIs against real Postgres/Redis |
| Frontend unit/component | Vitest + Testing Library | Auth UI, dashboard, items, usage, integrate, settings, focus trap |
| Manual / scripted integration | curl | Full HTTP contracts, headers, multi-user isolation |
| E2E browser | Not automated in CI | Protocol documented; Playwright not required for submission |
| Performance | curl timing / optional autocannon | Recorded when environment allows |

## Commands

```bash
# Backend (requires Postgres + Redis)
cd backend
npm test

# Frontend
cd frontend
npm test
npm run build
```

## Baseline results (Phase 12 regression)

| Suite | Result |
|-------|--------|
| Frontend Vitest | **55/55 passed** |
| Backend Jest | **41/41 passed** |
| Frontend production build | **Success** (~772 KB JS main chunk) |
| Health endpoints | `/health`, `/health/db`, `/health/redis` → ok |
| Scripted integration | Signup → PUT/GET HIT → GET MISS verified |

### Latency sample (local, 60 sequential requests, single user)

| Metric | Value |
|--------|-------|
| Requests | 20 PUT + 40 GET |
| p50 | ~7.3 ms |
| p95 | ~27.8 ms |
| Max | ~91.9 ms |

Environment: local Node backend, PostgreSQL 16, Redis 7 on same host. Not a production SLA claim.

## Coverage highlights

- Signup/login/logout, JWT cookie, API key create/list/revoke.
- Public GET/PUT/DELETE, X-Cache, quotas, 429.
- Stats aggregation, items search/TTL/delete/clear, usage counters.
- Integrate test-connection cleanup + safety TTL.
- ConfirmDialog focus trap and Escape.

## Gaps (documented)

- No automated Playwright suite in this environment (no guaranteed browser + display).
- Load tests are optional and environment-dependent; numbers only reported when measured.
- Redis/Postgres failure modes are partially covered via health endpoints and connection errors.

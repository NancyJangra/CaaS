# CaaS Architecture

## Component overview

```
[Browser SPA] --credentials--> [Express API]
                                  |        |
                                  v        v
                             PostgreSQL   Redis
```

| Layer | Responsibility |
|-------|----------------|
| React SPA | Auth UI, dashboard analytics, items, usage, integrate, settings |
| Express | REST API, middleware chain, validation, error handling |
| PostgreSQL | Users, plans, API key hashes, usage_events, api_request_events |
| Redis | Cache values, metadata sets, rate-limit counters, login rate limit |

## Request lifecycle

### Dashboard (JWT cookie)

1. Browser sends request with httpOnly session cookie.
2. `requireAuth` verifies JWT, loads user from PostgreSQL.
3. Handler scopes all SQL/Redis by `req.user.id`.
4. Response JSON; errors via centralized `errorHandler`.

### Public cache API (`x-api-key`)

1. `apiKeyAuth` hashes key, looks up active row, attaches `req.apiUser`.
2. `rateLimit` applies sliding-window + monthly quota (Lua / Redis).
3. Cache handler validates key/value/TTL, operates on `cache:{userId}:{key}`.
4. Async usage logging to PostgreSQL (non-blocking).

## Authentication flow

- Signup: bcrypt password → insert user → generate API key (hash stored, secret returned once) → set JWT cookie.
- Login: verify password (constant-time style check) → set JWT cookie.
- Logout: clear cookie.
- JWT: `sub` = user id; issuer/audience validated; cookie httpOnly, SameSite, Secure in production.

## Cache flow

- Namespace: `cache:{userId}:{key}` for values; `meta:{userId}` set + detail hashes for listing.
- PUT: validate size/TTL → enforce max_items → SET with EXPIRE → update metadata.
- GET: HIT returns value + TTL; MISS → 404 + `X-Cache: MISS`.
- DELETE: DEL + metadata cleanup.
- Expired keys cleaned from metadata on list/count.

## Rate-limiting flow

- Per-minute: Redis sorted set sliding window (Lua atomic check/increment).
- Monthly: calendar-month UTC counter in Redis.
- Limits from `plans` table via user’s plan.
- 429 includes `Retry-After` and rate-limit headers.
- Invalid API keys never reach the rate limiter (auth fails first).

## Database vs Redis

| Data | Store |
|------|--------|
| Users, plans, key hashes, analytics events | PostgreSQL |
| Cached values, TTL, item metadata, rate counters | Redis |

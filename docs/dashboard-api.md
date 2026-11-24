# CaaS Dashboard API

All endpoints require the JWT session cookie set by `POST /auth/login` or `POST /auth/signup`.

Base: `/api`

Timezone: **UTC** for all timestamps and monthly quota resets.

## Profile

### GET /api/me
Returns the authenticated user (no password or key hashes).

## API keys

### GET /api/keys
List key metadata (`id`, `prefix`/`keyPrefix`, `label`, `createdAt`, `lastUsedAt`, `revoked`).

### POST /api/keys
Body: `{ "label": "optional" }`. Returns full `apiKey` **once**.

### DELETE /api/keys/:id
Revoke (sets `revoked_at`). Ownership required.

## Statistics

### GET /api/stats?range=1h|24h|7d

- **hits / misses / hitRate**: from `usage_events` (GET outcomes only).
- **totalRequests**: admitted rows in `api_request_events`.
- **averageHitLatencyMs / averageMissLatencyMs**: AVG by outcome.
- **p50LatencyMs / p95LatencyMs**: `percentile_cont` over all `usage_events` latencies in range.
- **series**: zero-filled buckets (1h→5m, 24h→1h, 7d→6h) with hits, misses, hit/miss latency.

Hit rate = hits / (hits + misses) × 100, or 0 if no cache reads.

## Cached items

### GET /api/items?search=&page=&limit=&sort=&order=
Live Redis entries for the user only. Stale metadata cleaned.  
Sort allowlist: `key`, `size`, `ttl`, `createdAt`.

### PATCH /api/items/:key
Body: `{ "ttl": 3600 }`. Updates Redis EXPIRE; preserves value.

### DELETE /api/items/:key
Deletes Redis value + metadata.

### DELETE /api/items
Clears **this user's** cache only. Returns `deletedCount`.

## Usage

### GET /api/usage
Live Redis rate-limit counters + plan + cached item count (same source as the public rate limiter).

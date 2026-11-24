/**
 * Phase 5 — dashboard APIs (real Redis + Postgres).
 */
const request = require('supertest');
const app = require('../index');
const db = require('../db');
const redis = require('../services/redis');
const { buildCacheKey } = require('../utils/redisKeys');

const unique = () => `dash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;

async function signupAgent(email) {
  const agent = request.agent(app);
  const res = await agent
    .post('/auth/signup')
    .send({ email, password: 'SecurePassword123' });
  expect(res.status).toBe(201);
  return { agent, apiKey: res.body.apiKey, userId: res.body.user.id };
}

beforeAll(async () => {
  await redis.connect();
});

afterAll(async () => {
  await redis.quit();
  await db.pool.end();
});

describe('GET /api/me', () => {
  test('authenticated profile without secrets', async () => {
    const email = unique();
    const { agent } = await signupAgent(email);
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(email);
    expect(JSON.stringify(res.body)).not.toMatch(/password/);
    expect(JSON.stringify(res.body)).not.toMatch(/key_hash/);
  });

  test('unauthenticated → 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });
});

describe('API keys', () => {
  test('list / create / secret once / revoke isolation', async () => {
    const a = await signupAgent(unique());
    const list1 = await a.agent.get('/api/keys');
    expect(list1.body.success).toBe(true);
    expect(list1.body.keys.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(list1.body)).not.toMatch(/caas_live_[a-f0-9]{20,}/);

    const created = await a.agent.post('/api/keys').send({ label: 'CI' });
    expect(created.status).toBe(201);
    expect(created.body.apiKey).toMatch(/^caas_live_/);
    const keyId = created.body.key.id;

    const b = await signupAgent(unique());
    const forbidden = await b.agent.delete(`/api/keys/${keyId}`);
    expect([403, 404]).toContain(forbidden.status);

    const rev = await a.agent.delete(`/api/keys/${keyId}`);
    expect(rev.status).toBe(200);
  });
});

describe('GET /api/stats', () => {
  test('returns zero-safe summary and series for empty range', async () => {
    const { agent } = await signupAgent(unique());
    for (const range of ['1h', '24h', '7d']) {
      const res = await agent.get(`/api/stats?range=${range}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.hitRate).toBe(0);
      expect(Array.isArray(res.body.series)).toBe(true);
      expect(res.body.series.length).toBeGreaterThan(0);
    }
  });

  test('reflects inserted usage_events', async () => {
    const { agent, userId } = await signupAgent(unique());
    await db.query(
      `INSERT INTO usage_events (user_id, cache_key, outcome, latency_ms)
       VALUES ($1, 'k', 'hit', 5), ($1, 'k', 'miss', 50), ($1, 'k', 'hit', 3)`,
      [userId]
    );
    await db.query(
      `INSERT INTO api_request_events (user_id, operation, admitted)
       VALUES ($1, 'GET', true), ($1, 'GET', true), ($1, 'PUT', true)`,
      [userId]
    );
    const res = await agent.get('/api/stats?range=24h');
    expect(res.status).toBe(200);
    expect(res.body.summary.hits).toBe(2);
    expect(res.body.summary.misses).toBe(1);
    expect(res.body.summary.hitRate).toBeCloseTo(66.67, 1);
    expect(res.body.summary.totalRequests).toBe(3);
    expect(res.body.summary.p50LatencyMs).toBeGreaterThan(0);
  });

  test('stats are user-scoped', async () => {
    const a = await signupAgent(unique());
    const b = await signupAgent(unique());
    await db.query(
      `INSERT INTO usage_events (user_id, cache_key, outcome, latency_ms)
       VALUES ($1, 'only-a', 'hit', 1)`,
      [a.userId]
    );
    const resB = await b.agent.get('/api/stats?range=1h');
    expect(resB.body.summary.hits).toBe(0);
  });
});

describe('Cached items', () => {
  test('list, search, ttl patch, delete, clear-all isolation', async () => {
    const a = await signupAgent(unique());
    const b = await signupAgent(unique());

    // Seed via public API
    await request(app)
      .put('/v1/cache/user:1')
      .set('x-api-key', a.apiKey)
      .send({ value: { n: 1 }, ttl: 120 });
    await request(app)
      .put('/v1/cache/user:2')
      .set('x-api-key', a.apiKey)
      .send({ value: { n: 2 }, ttl: 120 });
    await request(app)
      .put('/v1/cache/other')
      .set('x-api-key', b.apiKey)
      .send({ value: { n: 9 }, ttl: 120 });

    const list = await a.agent.get('/api/items');
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBe(2);

    const search = await a.agent.get('/api/items?search=user:1');
    expect(search.body.items.length).toBe(1);
    expect(search.body.items[0].key).toBe('user:1');
    expect(search.body.items[0].ttlRemaining).toBeGreaterThan(0);

    const patch = await a.agent
      .patch('/api/items/user:1')
      .send({ ttl: 600 });
    expect(patch.status).toBe(200);
    expect(patch.body.ttl).toBe(600);

    // B cannot delete A's key
    const cross = await b.agent.delete('/api/items/user:1');
    expect(cross.status).toBe(404);

    const del = await a.agent.delete('/api/items/user:1');
    expect(del.status).toBe(200);

    const clear = await a.agent.delete('/api/items');
    expect(clear.status).toBe(200);
    expect(clear.body.deletedCount).toBeGreaterThanOrEqual(1);

    // B's data intact
    const stillB = await request(app)
      .get('/v1/cache/other')
      .set('x-api-key', b.apiKey);
    expect(stillB.status).toBe(200);
  });
});

describe('GET /api/usage', () => {
  test('live counters', async () => {
    const { agent } = await signupAgent(unique());
    const res = await agent.get('/api/usage');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.plan.requestsPerMinute).toBe(100);
    expect(typeof res.body.usage.monthlyUsed).toBe('number');
    expect(typeof res.body.usage.cachedItems).toBe('number');
  });
});

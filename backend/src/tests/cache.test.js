/**
 * Phase 3 — Redis cache engine integration tests (real Redis + Postgres).
 */
const request = require('supertest');
const app = require('../index');
const db = require('../db');
const redis = require('../services/redis');
const { buildCacheKey } = require('../utils/redisKeys');

const unique = () => `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;

async function signupAndGetKey(email) {
  const res = await request(app)
    .post('/auth/signup')
    .send({ email, password: 'SecurePassword123' });
  expect(res.status).toBe(201);
  return {
    apiKey: res.body.apiKey,
    userId: res.body.user.id,
    agent: request.agent(app),
  };
}

beforeAll(async () => {
  await redis.connect();
});

afterAll(async () => {
  await redis.quit();
  await db.pool.end();
});

describe('API key auth on cache routes', () => {
  test('missing API key → 401 MISSING_API_KEY', async () => {
    const res = await request(app).get('/v1/cache/foo');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MISSING_API_KEY');
  });

  test('invalid API key → 401 INVALID_API_KEY', async () => {
    const res = await request(app)
      .get('/v1/cache/foo')
      .set('x-api-key', 'caas_live_notarealkey000000000000000000000000000000000000000000000000');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_API_KEY');
  });

  test('revoked API key → 401 REVOKED_API_KEY', async () => {
    const email = unique();
    const { apiKey, agent } = await signupAndGetKey(email);
    // login to get cookie for revoke
    await agent.post('/auth/login').send({ email, password: 'SecurePassword123' });
    const keys = await agent.get('/api/keys');
    const keyId = keys.body.keys[0].id;
    await agent.delete(`/api/keys/${keyId}`);

    const res = await request(app)
      .get('/v1/cache/foo')
      .set('x-api-key', apiKey);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('REVOKED_API_KEY');
  });
});

describe('Cache miss / put / hit', () => {
  let apiKey;
  let userId;

  beforeAll(async () => {
    ({ apiKey, userId } = await signupAndGetKey(unique()));
  });

  test('GET nonexistent → 404 MISS', async () => {
    const res = await request(app)
      .get('/v1/cache/user:42')
      .set('x-api-key', apiKey);
    expect(res.status).toBe(404);
    expect(res.body.cached).toBe(false);
    expect(res.headers['x-cache']).toBe('MISS');
  });

  test('PUT stores value with TTL', async () => {
    const res = await request(app)
      .put('/v1/cache/user:42')
      .set('x-api-key', apiKey)
      .send({ value: { id: 42, name: 'Example' }, ttl: 300 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ttl).toBe(300);

    const client = await redis.connect();
    const raw = await client.get(buildCacheKey(userId, 'user:42'));
    expect(JSON.parse(raw)).toEqual({ id: 42, name: 'Example' });
    const ttl = await client.ttl(buildCacheKey(userId, 'user:42'));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  test('GET existing → 200 HIT with same value', async () => {
    const res = await request(app)
      .get('/v1/cache/user:42')
      .set('x-api-key', apiKey);
    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(res.body.value).toEqual({ id: 42, name: 'Example' });
    expect(res.headers['x-cache']).toBe('HIT');
    expect(res.body.ttl).toBeGreaterThan(0);
  });
});

describe('DELETE', () => {
  let apiKey;
  let userId;

  beforeAll(async () => {
    ({ apiKey, userId } = await signupAndGetKey(unique()));
  });

  test('delete removes Redis entry and metadata', async () => {
    await request(app)
      .put('/v1/cache/to-delete')
      .set('x-api-key', apiKey)
      .send({ value: { x: 1 }, ttl: 60 });

    const del = await request(app)
      .delete('/v1/cache/to-delete')
      .set('x-api-key', apiKey);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);

    const client = await redis.connect();
    expect(await client.exists(buildCacheKey(userId, 'to-delete'))).toBe(0);

    const miss = await request(app)
      .get('/v1/cache/to-delete')
      .set('x-api-key', apiKey);
    expect(miss.status).toBe(404);
  });

  test('delete missing key → 404', async () => {
    const res = await request(app)
      .delete('/v1/cache/never-existed')
      .set('x-api-key', apiKey);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CACHE_KEY_NOT_FOUND');
  });
});

describe('TTL expiration', () => {
  test('key expires and subsequent GET is MISS', async () => {
    const { apiKey } = await signupAndGetKey(unique());
    await request(app)
      .put('/v1/cache/short-lived')
      .set('x-api-key', apiKey)
      .send({ value: { t: true }, ttl: 1 });

    await new Promise((r) => setTimeout(r, 1200));

    const res = await request(app)
      .get('/v1/cache/short-lived')
      .set('x-api-key', apiKey);
    expect(res.status).toBe(404);
    expect(res.headers['x-cache']).toBe('MISS');
  }, 10000);
});

describe('Multi-tenant isolation', () => {
  test('same key name is isolated per user', async () => {
    const a = await signupAndGetKey(unique());
    const b = await signupAndGetKey(unique());

    await request(app)
      .put('/v1/cache/shared-name')
      .set('x-api-key', a.apiKey)
      .send({ value: { owner: 'A' }, ttl: 120 });

    await request(app)
      .put('/v1/cache/shared-name')
      .set('x-api-key', b.apiKey)
      .send({ value: { owner: 'B' }, ttl: 120 });

    const getA = await request(app)
      .get('/v1/cache/shared-name')
      .set('x-api-key', a.apiKey);
    const getB = await request(app)
      .get('/v1/cache/shared-name')
      .set('x-api-key', b.apiKey);

    expect(getA.body.value).toEqual({ owner: 'A' });
    expect(getB.body.value).toEqual({ owner: 'B' });

    // A cannot delete B's data
    await request(app)
      .delete('/v1/cache/shared-name')
      .set('x-api-key', a.apiKey);

    const stillB = await request(app)
      .get('/v1/cache/shared-name')
      .set('x-api-key', b.apiKey);
    expect(stillB.status).toBe(200);
    expect(stillB.body.value).toEqual({ owner: 'B' });
  });
});

describe('Input validation', () => {
  let apiKey;
  beforeAll(async () => {
    ({ apiKey } = await signupAndGetKey(unique()));
  });

  test('missing value → 400', async () => {
    const res = await request(app)
      .put('/v1/cache/k')
      .set('x-api-key', apiKey)
      .send({ ttl: 10 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_REQUEST_BODY');
  });

  test('negative TTL → 400', async () => {
    const res = await request(app)
      .put('/v1/cache/k')
      .set('x-api-key', apiKey)
      .send({ value: 1, ttl: -5 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TTL');
  });

  test('zero TTL → 400', async () => {
    const res = await request(app)
      .put('/v1/cache/k')
      .set('x-api-key', apiKey)
      .send({ value: 1, ttl: 0 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TTL');
  });
});

describe('Item quota', () => {
  test('updating existing key does not count as new; max enforced', async () => {
    // Temporarily lower max_items for free plan in this test via direct SQL
    await db.query(`UPDATE plans SET max_items = 2 WHERE name = 'free'`);

    try {
      const { apiKey } = await signupAndGetKey(unique());

      await request(app)
        .put('/v1/cache/a')
        .set('x-api-key', apiKey)
        .send({ value: 1, ttl: 60 });
      await request(app)
        .put('/v1/cache/b')
        .set('x-api-key', apiKey)
        .send({ value: 2, ttl: 60 });

      // update existing should succeed
      const update = await request(app)
        .put('/v1/cache/a')
        .set('x-api-key', apiKey)
        .send({ value: 11, ttl: 60 });
      expect(update.status).toBe(200);

      // third new key should fail
      const over = await request(app)
        .put('/v1/cache/c')
        .set('x-api-key', apiKey)
        .send({ value: 3, ttl: 60 });
      expect(over.status).toBe(429);
      expect(over.body.code).toBe('CACHE_QUOTA_EXCEEDED');
    } finally {
      await db.query(`UPDATE plans SET max_items = 1000 WHERE name = 'free'`);
    }
  });
});

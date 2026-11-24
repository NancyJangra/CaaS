/**
 * Phase 4 — rate limiting & usage tracking (real Redis + Postgres).
 */
const request = require('supertest');
const app = require('../index');
const db = require('../db');
const redis = require('../services/redis');
const planService = require('../services/planService');
const rateLimiter = require('../services/rateLimiter');

const unique = () => `rl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;

async function signupKey(email) {
  const res = await request(app)
    .post('/auth/signup')
    .send({ email, password: 'SecurePassword123' });
  expect(res.status).toBe(201);
  return { apiKey: res.body.apiKey, userId: res.body.user.id };
}

beforeAll(async () => {
  await redis.connect();
  // Ensure free plan exists with known defaults
  await db.query(`
    INSERT INTO plans (name, requests_per_minute, requests_per_month, max_items)
    VALUES ('free', 100, 10000, 1000)
    ON CONFLICT (name) DO UPDATE SET
      requests_per_minute = 100,
      requests_per_month = 10000,
      max_items = 1000
  `);
});

afterAll(async () => {
  // Restore free plan
  await db.query(`UPDATE plans SET requests_per_minute = 100, requests_per_month = 10000, max_items = 1000 WHERE name = 'free'`);
  await redis.quit();
  await db.pool.end();
});

describe('Per-minute rate limit', () => {
  test('admits within limit and sets headers; rejects over limit', async () => {
    // Lower limit for this user via plan override: temporarily use a tiny plan
    await db.query(`
      INSERT INTO plans (name, requests_per_minute, requests_per_month, max_items)
      VALUES ('test_minute', 3, 10000, 1000)
      ON CONFLICT (name) DO UPDATE SET requests_per_minute = 3, requests_per_month = 10000
    `);

    const email = unique();
    const { apiKey, userId } = await signupKey(email);
    await db.query(`UPDATE users SET plan = 'test_minute' WHERE id = $1`, [userId]);

    // Clear any prior counters
    const client = await redis.connect();
    await client.del(rateLimiter.minuteKey(userId));
    await client.del(rateLimiter.monthKey(userId));

    const results = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .get('/v1/cache/probe')
        .set('x-api-key', apiKey);
      results.push(res);
    }

    // First 3 admitted (404 miss is fine), 4th is 429
    expect(results[0].status).toBe(404);
    expect(results[0].headers['x-ratelimit-limit']).toBe('3');
    expect(Number(results[0].headers['x-ratelimit-remaining'])).toBeLessThanOrEqual(2);

    expect(results[1].status).toBe(404);
    expect(results[2].status).toBe(404);

    expect(results[3].status).toBe(429);
    expect(results[3].body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(results[3].headers['retry-after']).toBeDefined();
    expect(results[3].headers['x-ratelimit-limit']).toBe('3');
    expect(results[3].headers['x-ratelimit-remaining']).toBe('0');

    // Cleanup plan
    await db.query(`UPDATE users SET plan = 'free' WHERE id = $1`, [userId]);
  });
});

describe('Monthly quota', () => {
  test('enforces monthly limit and does not double-count rejected', async () => {
    await db.query(`
      INSERT INTO plans (name, requests_per_minute, requests_per_month, max_items)
      VALUES ('test_month', 100, 2, 1000)
      ON CONFLICT (name) DO UPDATE SET requests_per_minute = 100, requests_per_month = 2
    `);

    const email = unique();
    const { apiKey, userId } = await signupKey(email);
    await db.query(`UPDATE users SET plan = 'test_month' WHERE id = $1`, [userId]);

    const client = await redis.connect();
    await client.del(rateLimiter.minuteKey(userId));
    await client.del(rateLimiter.monthKey(userId));

    const r1 = await request(app).get('/v1/cache/m1').set('x-api-key', apiKey);
    const r2 = await request(app).put('/v1/cache/m2').set('x-api-key', apiKey).send({ value: 1, ttl: 30 });
    const r3 = await request(app).delete('/v1/cache/m2').set('x-api-key', apiKey);

    expect(r1.status).toBe(404);
    expect(r2.status).toBe(200);
    // 3rd should hit monthly limit
    expect(r3.status).toBe(429);
    expect(r3.body.code).toBe('MONTHLY_QUOTA_EXCEEDED');
    expect(r3.body.resetAt).toBeDefined();
    expect(r3.headers['x-monthlylimit']).toBe('2');
    expect(r3.headers['x-monthlyremaining']).toBe('0');

    // Counter should still be 2 (rejected did not increment)
    const used = parseInt((await client.get(rateLimiter.monthKey(userId))) || '0', 10);
    expect(used).toBe(2);

    await db.query(`UPDATE users SET plan = 'free' WHERE id = $1`, [userId]);
  });
});

describe('Headers on successful requests', () => {
  test('includes rate limit and monthly headers', async () => {
    const { apiKey } = await signupKey(unique());
    const res = await request(app)
      .get('/v1/cache/hdr')
      .set('x-api-key', apiKey);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
    expect(res.headers['x-monthlylimit']).toBeDefined();
    expect(res.headers['x-monthlyremaining']).toBeDefined();
    expect(res.headers['x-monthlyreset']).toBeDefined();
    expect(res.headers['x-cache']).toBe('MISS');
  });
});

describe('User isolation of counters', () => {
  test('two users have independent counters', async () => {
    await db.query(`
      INSERT INTO plans (name, requests_per_minute, requests_per_month, max_items)
      VALUES ('test_iso', 2, 10000, 1000)
      ON CONFLICT (name) DO UPDATE SET requests_per_minute = 2
    `);

    const a = await signupKey(unique());
    const b = await signupKey(unique());
    await db.query(`UPDATE users SET plan = 'test_iso' WHERE id = $1`, [a.userId]);
    await db.query(`UPDATE users SET plan = 'test_iso' WHERE id = $1`, [b.userId]);

    const client = await redis.connect();
    await client.del(rateLimiter.minuteKey(a.userId));
    await client.del(rateLimiter.minuteKey(b.userId));

    await request(app).get('/v1/cache/x').set('x-api-key', a.apiKey);
    await request(app).get('/v1/cache/x').set('x-api-key', a.apiKey);
    const aBlocked = await request(app).get('/v1/cache/x').set('x-api-key', a.apiKey);
    expect(aBlocked.status).toBe(429);

    // B still has full quota
    const bOk = await request(app).get('/v1/cache/x').set('x-api-key', b.apiKey);
    expect(bOk.status).toBe(404);

    await db.query(`UPDATE users SET plan = 'free' WHERE id IN ($1, $2)`, [a.userId, b.userId]);
  });
});

describe('GET /api/usage', () => {
  test('returns real snapshot for authenticated user', async () => {
    const email = unique();
    const agent = request.agent(app);
    await agent.post('/auth/signup').send({ email, password: 'SecurePassword123' });
    const res = await agent.get('/api/usage');
    expect(res.status).toBe(200);
    expect(res.body.plan.name).toBe('free');
    expect(res.body.usage.minuteLimit).toBe(100);
    expect(res.body.usage.monthlyLimit).toBe(10000);
    expect(typeof res.body.usage.minuteUsed).toBe('number');
  });
});

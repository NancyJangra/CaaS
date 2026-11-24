/**
 * Phase 2 auth & API key tests.
 * Run: npm test (from backend, with DB + Redis up)
 */
const request = require('supertest');
const app = require('../index');
const db = require('../db');
const redis = require('../services/redis');
const { hashApiKey } = require('../services/apiKey');

const unique = () => `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.local`;

beforeAll(async () => {
  await redis.connect();
});

afterAll(async () => {
  await redis.quit();
  await db.pool.end();
});

describe('POST /auth/signup', () => {
  test('creates user, returns apiKey once, sets cookie', async () => {
    const email = unique();
    const res = await request(app)
      .post('/auth/signup')
      .send({ email, password: 'SecurePassword123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.plan).toBe('free');
    expect(res.body.apiKey).toMatch(/^caas_live_[a-f0-9]{64}$/);
    expect(res.headers['set-cookie']).toBeDefined();

    // password_hash and key_hash not in response
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash/);
    expect(JSON.stringify(res.body)).not.toMatch(/key_hash/);
  });

  test('rejects short password', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: unique(), password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PASSWORD');
  });

  test('rejects invalid email', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'SecurePassword123' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_EMAIL');
  });

  test('rejects duplicate email with 409', async () => {
    const email = unique();
    await request(app)
      .post('/auth/signup')
      .send({ email, password: 'SecurePassword123' });
    const res = await request(app)
      .post('/auth/signup')
      .send({ email, password: 'SecurePassword123' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('stores only hash of API key', async () => {
    const email = unique();
    const res = await request(app)
      .post('/auth/signup')
      .send({ email, password: 'SecurePassword123' });
    const secret = res.body.apiKey;
    const expectedHash = hashApiKey(secret);

    const { rows } = await db.query(
      `SELECT k.key_hash FROM api_keys k
       JOIN users u ON u.id = k.user_id
       WHERE u.email = $1`,
      [email]
    );
    expect(rows[0].key_hash).toBe(expectedHash);
    expect(rows[0].key_hash).not.toBe(secret);
  });
});

describe('POST /auth/login + session', () => {
  let email;
  let agent;

  beforeAll(async () => {
    email = unique();
    await request(app)
      .post('/auth/signup')
      .send({ email, password: 'SecurePassword123' });
  });

  test('login succeeds and sets cookie', async () => {
    agent = request.agent(app);
    const res = await agent
      .post('/auth/login')
      .send({ email, password: 'SecurePassword123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('GET /api/me returns profile', async () => {
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash/);
  });

  test('wrong password returns INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'WrongPassword99' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('logout clears session', async () => {
    const res = await agent.post('/auth/logout');
    expect(res.status).toBe(200);
    const me = await agent.get('/api/me');
    expect(me.status).toBe(401);
  });
});

describe('API keys', () => {
  let agent;
  let keyId;

  beforeAll(async () => {
    const email = unique();
    agent = request.agent(app);
    await agent
      .post('/auth/signup')
      .send({ email, password: 'SecurePassword123' });
  });

  test('list keys never returns secret', async () => {
    const res = await agent.get('/api/keys');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keys)).toBe(true);
    const blob = JSON.stringify(res.body);
    expect(blob).not.toMatch(/caas_live_[a-f0-9]{20,}/);
  });

  test('create key returns secret once', async () => {
    const res = await agent
      .post('/api/keys')
      .send({ label: 'test-key' });
    expect(res.status).toBe(201);
    expect(res.body.apiKey).toMatch(/^caas_live_/);
    keyId = res.body.key.id;
  });

  test('revoke key', async () => {
    const res = await agent.delete(`/api/keys/${keyId}`);
    expect(res.status).toBe(200);
    const again = await agent.delete(`/api/keys/${keyId}`);
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('API_KEY_ALREADY_REVOKED');
  });

  test('user isolation: cannot revoke other user key', async () => {
    const email2 = unique();
    const agent2 = request.agent(app);
    const signup2 = await agent2
      .post('/auth/signup')
      .send({ email: email2, password: 'SecurePassword123' });
    const otherKeyId = (await agent2.get('/api/keys')).body.keys[0].id;

    const res = await agent.delete(`/api/keys/${otherKeyId}`);
    expect([403, 404]).toContain(res.status);
  });
});

describe('Unauthenticated', () => {
  test('GET /api/me without cookie is 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

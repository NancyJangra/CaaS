const db = require('../db');
const { hashPassword, verifyPassword, validatePassword } = require('../services/password');
const { generateApiKey } = require('../services/apiKey');
const { signToken, cookieOptions, clearCookieOptions } = require('../services/token');
const { clearLoginRateLimit } = require('../middleware/loginRateLimit');
const { AppError } = require('../utils/errors');
const config = require('../config');

function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function validateEmail(email) {
  const normalized = normalizeEmail(email);
  // Simple practical validation
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError('INVALID_EMAIL', 'Please provide a valid email address.', {
      status: 400,
      fix: 'Use a format like name@example.com.',
    });
  }
  if (normalized.length > 255) {
    throw new AppError('INVALID_EMAIL', 'Email is too long.', { status: 400 });
  }
  return normalized;
}

/**
 * POST /auth/signup
 */
async function signup(req, res, next) {
  const client = await db.pool.connect();
  try {
    const email = validateEmail(req.body?.email);
    const password = req.body?.password;
    validatePassword(password);

    await client.query('BEGIN');

    // Check existing
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists.', {
        status: 409,
        fix: 'Try logging in instead.',
      });
    }

    const passwordHash = await hashPassword(password);

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, plan)
       VALUES ($1, $2, 'free')
       RETURNING id, email, plan, created_at`,
      [email, passwordHash]
    );
    const user = userResult.rows[0];

    const { secret, prefix, hash } = generateApiKey();

    await client.query(
      `INSERT INTO api_keys (user_id, key_prefix, key_hash, label)
       VALUES ($1, $2, $3, $4)`,
      [user.id, prefix, hash, 'Default']
    );

    await client.query('COMMIT');

    const token = signToken(user.id);
    res.cookie(config.cookie.name, token, cookieOptions());

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
      apiKey: secret,
      message:
        'Account created successfully. Save your API key because it will only be shown once.',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /auth/login
 */
async function login(req, res, next) {
  try {
    const email = validateEmail(req.body?.email);
    const password = req.body?.password;

    // Always perform similar work to avoid timing leaks on missing user
    const { rows } = await db.query(
      'SELECT id, email, plan, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );

    const user = rows[0];
    const hash = user?.password_hash || '$2b$12$invalidhashplaceholderxxxxxxxxxxxx';
    const match = await verifyPassword(password || '', hash);

    if (!user || !match) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', {
        status: 401,
        fix: 'Check your credentials and try again.',
      });
    }

    await clearLoginRateLimit(req.loginRateKey);

    const token = signToken(user.id);
    res.cookie(config.cookie.name, token, cookieOptions());

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 */
async function logout(req, res, next) {
  try {
    res.clearCookie(config.cookie.name, clearCookieOptions());
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  logout,
};

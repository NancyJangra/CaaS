const redis = require('../services/redis');
const config = require('../config');
const { AppError } = require('../utils/errors');

/**
 * Rate-limit failed login attempts by IP (and optionally email).
 * Does not reveal whether the email exists.
 */
async function loginRateLimit(req, res, next) {
  try {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `login_rl:${ip}`;
    const { windowSeconds, maxAttempts } = config.auth.loginRateLimit;

    const client = await redis.connect();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }

    if (count > maxAttempts) {
      const ttl = await client.ttl(key);
      const retryAfter = ttl > 0 ? ttl : windowSeconds;
      res.set('Retry-After', String(retryAfter));
      throw new AppError(
        'RATE_LIMIT_EXCEEDED',
        `Too many login attempts. Try again in ${retryAfter} seconds.`,
        {
          status: 429,
          fix: 'Wait and try again, or reset your password if needed.',
        }
      );
    }

    // Attach helper so login handler can clear on success if desired
    req.loginRateKey = key;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Reset the rate-limit counter after a successful login (optional).
 */
async function clearLoginRateLimit(key) {
  if (!key) return;
  try {
    const client = await redis.connect();
    await client.del(key);
  } catch {
    // non-fatal
  }
}

module.exports = {
  loginRateLimit,
  clearLoginRateLimit,
};

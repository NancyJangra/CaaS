const crypto = require('crypto');
const { AppError } = require('../utils/errors');

const PREFIX = 'caas_live_';

/**
 * Generate a new API key secret.
 * Returns { secret, prefix, hash } — secret is shown only once.
 */
function generateApiKey() {
  const random = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const secret = `${PREFIX}${random}`;
  const prefix = getKeyPrefix(secret);
  const hash = hashApiKey(secret);
  return { secret, prefix, hash };
}

/**
 * SHA-256 hash of the full secret (hex).
 */
function hashApiKey(secret) {
  if (typeof secret !== 'string' || !secret.startsWith(PREFIX)) {
    throw new AppError('API_KEY_GENERATION_FAILED', 'Invalid API key format.', {
      status: 500,
    });
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest('hex');
}

/**
 * Constant-time compare of a presented secret against a stored hash.
 */
function verifyApiKey(secret, storedHash) {
  if (typeof secret !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  try {
    const candidate = hashApiKey(secret);
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Short display prefix, e.g. "caas_live_9f3a..."
 */
function getKeyPrefix(secret) {
  if (typeof secret !== 'string' || secret.length < 16) {
    return PREFIX + '****';
  }
  // first 12 chars after prefix for display
  return secret.slice(0, PREFIX.length + 8) + '...';
}

module.exports = {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  getKeyPrefix,
  PREFIX,
};

const db = require('../db');
const { hashApiKey, PREFIX } = require('../services/apiKey');
const { AppError } = require('../utils/errors');

/**
 * Authenticate public cache API requests via x-api-key header.
 * Attaches req.apiUser = { id, plan, apiKeyId }
 * Does NOT use JWT.
 */
async function apiKeyAuth(req, res, next) {
  try {
    const raw = req.headers['x-api-key'];
    if (!raw || typeof raw !== 'string' || raw.trim() === '') {
      throw new AppError('MISSING_API_KEY', 'API key is required.', {
        status: 401,
        fix: 'Send the x-api-key header with your key.',
      });
    }

    const secret = raw.trim();
    if (!secret.startsWith(PREFIX)) {
      throw new AppError('INVALID_API_KEY', 'Invalid API key.', {
        status: 401,
        fix: 'Check that you are using a valid caas_live_ key.',
      });
    }

    let keyHash;
    try {
      keyHash = hashApiKey(secret);
    } catch {
      throw new AppError('INVALID_API_KEY', 'Invalid API key.', {
        status: 401,
        fix: 'Check that you are using a valid caas_live_ key.',
      });
    }

    const { rows } = await db.query(
      `SELECT k.id AS api_key_id, k.revoked_at, k.user_id, u.plan
       FROM api_keys k
       JOIN users u ON u.id = k.user_id
       WHERE k.key_hash = $1`,
      [keyHash]
    );

    if (rows.length === 0) {
      throw new AppError('INVALID_API_KEY', 'Invalid API key.', {
        status: 401,
        fix: 'Check that you are using a valid, non-revoked key.',
      });
    }

    const row = rows[0];
    if (row.revoked_at) {
      throw new AppError('REVOKED_API_KEY', 'This API key has been revoked.', {
        status: 401,
        fix: 'Generate a new API key from the dashboard.',
      });
    }

    // Touch last_used_at (fire-and-forget)
    db.query(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
      [row.api_key_id]
    ).catch(() => {});

    req.apiUser = {
      id: row.user_id,
      plan: row.plan,
      apiKeyId: row.api_key_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { apiKeyAuth };

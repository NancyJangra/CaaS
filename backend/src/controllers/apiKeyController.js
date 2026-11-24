const db = require('../db');
const { generateApiKey } = require('../services/apiKey');
const { AppError } = require('../utils/errors');
const { assertOwnership } = require('../middleware/auth');

/**
 * GET /api/keys
 */
async function listKeys(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, key_prefix, label, created_at, last_used_at, revoked_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      keys: rows.map((r) => ({
        id: r.id,
        keyPrefix: r.key_prefix,
        prefix: r.key_prefix,
        label: r.label,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
        revoked: r.revoked_at != null,
        revokedAt: r.revoked_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/keys
 * Body optional: { label?: string }
 * Returns full secret once.
 */
async function createKey(req, res, next) {
  try {
    const label =
      typeof req.body?.label === 'string' && req.body.label.trim()
        ? req.body.label.trim().slice(0, 100)
        : 'Default';

    const { secret, prefix, hash } = generateApiKey();

    const { rows } = await db.query(
      `INSERT INTO api_keys (user_id, key_prefix, key_hash, label)
       VALUES ($1, $2, $3, $4)
       RETURNING id, key_prefix, label, created_at`,
      [req.user.id, prefix, hash, label]
    );

    const row = rows[0];
    res.status(201).json({
      success: true,
      key: {
        id: row.id,
        keyPrefix: row.key_prefix,
        label: row.label,
        createdAt: row.created_at,
      },
      apiKey: secret,
      message: 'API key created. Save it now; it will not be shown again.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/keys/:id
 */
async function revokeKey(req, res, next) {
  try {
    const keyId = req.params.id;

    const { rows } = await db.query(
      `SELECT id, user_id, revoked_at FROM api_keys WHERE id = $1`,
      [keyId]
    );

    if (rows.length === 0) {
      throw new AppError('API_KEY_NOT_FOUND', 'API key not found.', {
        status: 404,
        fix: 'Check the key ID and try again.',
      });
    }

    const key = rows[0];
    assertOwnership(req.user.id, key.user_id);

    if (key.revoked_at) {
      throw new AppError('API_KEY_ALREADY_REVOKED', 'This API key is already revoked.', {
        status: 400,
        fix: 'No action needed.',
      });
    }

    await db.query(
      `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1`,
      [keyId]
    );

    res.json({
      success: true,
      message: 'API key revoked.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listKeys,
  createKey,
  revokeKey,
};

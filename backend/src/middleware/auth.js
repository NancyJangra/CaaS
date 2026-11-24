const config = require('../config');
const { verifyToken } = require('../services/token');
const { AppError } = require('../utils/errors');
const db = require('../db');

/**
 * Require a valid dashboard JWT cookie.
 * Attaches req.user = { id, email, plan, createdAt }
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[config.cookie.name];
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', {
        status: 401,
        fix: 'Log in to continue.',
      });
    }

    const { userId } = verifyToken(token);

    const { rows } = await db.query(
      `SELECT id, email, plan, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      throw new AppError('UNAUTHORIZED', 'User no longer exists.', {
        status: 401,
        fix: 'Log in again.',
      });
    }

    const row = rows[0];
    req.user = {
      id: row.id,
      email: row.email,
      plan: row.plan,
      createdAt: row.created_at,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensure the resource belongs to the authenticated user.
 * Usage: assertOwnership(req.user.id, resource.user_id)
 */
function assertOwnership(authUserId, resourceUserId) {
  if (String(authUserId) !== String(resourceUserId)) {
    throw new AppError('FORBIDDEN', 'You do not have access to this resource.', {
      status: 403,
      fix: 'Check that you are using the correct account.',
    });
  }
}

module.exports = {
  requireAuth,
  assertOwnership,
};

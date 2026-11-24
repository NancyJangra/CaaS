const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/errors');

/**
 * Sign a JWT for the dashboard session.
 * @param {string} userId
 */
function signToken(userId) {
  return jwt.sign(
    {},
    config.jwt.secret,
    {
      subject: String(userId),
      expiresIn: config.jwt.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }
  );
}

/**
 * Verify and decode a JWT. Throws AppError on failure.
 */
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    if (!payload.sub) {
      throw new AppError('INVALID_TOKEN', 'Token is missing subject.', {
        status: 401,
        fix: 'Log in again.',
      });
    }
    return { userId: payload.sub };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw new AppError('TOKEN_EXPIRED', 'Your session has expired.', {
        status: 401,
        fix: 'Log in again.',
      });
    }
    throw new AppError('INVALID_TOKEN', 'Invalid authentication token.', {
      status: 401,
      fix: 'Log in again.',
    });
  }
}

/**
 * Cookie options for setting / clearing the auth cookie.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAgeMs,
    path: '/',
  };
}

/**
 * Options used when clearing the cookie (must match path/secure/sameSite).
 */
function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
  };
}

module.exports = {
  signToken,
  verifyToken,
  cookieOptions,
  clearCookieOptions,
};

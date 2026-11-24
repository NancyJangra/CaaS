const bcrypt = require('bcrypt');
const config = require('../config');
const { AppError } = require('../utils/errors');

/**
 * Validate password against policy. Throws AppError on failure.
 */
function validatePassword(password) {
  if (typeof password !== 'string') {
    throw new AppError('INVALID_PASSWORD', 'Password is required.', {
      status: 400,
      fix: 'Provide a password string.',
    });
  }
  const len = password.length;
  if (len < config.auth.minPasswordLength) {
    throw new AppError(
      'INVALID_PASSWORD',
      `Password must be at least ${config.auth.minPasswordLength} characters.`,
      { status: 400, fix: 'Choose a longer password.' }
    );
  }
  if (len > config.auth.maxPasswordLength) {
    throw new AppError(
      'INVALID_PASSWORD',
      `Password must be at most ${config.auth.maxPasswordLength} characters.`,
      { status: 400, fix: 'Choose a shorter password.' }
    );
  }
}

/**
 * Hash a password with bcrypt.
 */
async function hashPassword(password) {
  validatePassword(password);
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

/**
 * Verify a password against a stored hash.
 */
async function verifyPassword(password, passwordHash) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') {
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  validatePassword,
  hashPassword,
  verifyPassword,
};

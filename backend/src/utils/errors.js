/**
 * Application error with stable code for the centralized error handler.
 */
class AppError extends Error {
  constructor(code, message, { status = 400, fix = null, docsUrl = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.fix = fix;
    this.docsUrl = docsUrl;
  }
}

module.exports = { AppError };

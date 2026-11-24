const rateLimiter = require('../services/rateLimiter');
const { AppError } = require('../utils/errors');

/**
 * Apply rate-limit headers to a response.
 */
function setRateLimitHeaders(res, info) {
  if (!info) return;
  if (info.minute) {
    res.set('X-RateLimit-Limit', String(info.minute.limit));
    res.set('X-RateLimit-Remaining', String(info.minute.remaining));
    res.set('X-RateLimit-Reset', String(info.minute.resetAt));
  }
  if (info.monthly) {
    res.set('X-MonthlyLimit', String(info.monthly.limit));
    res.set('X-MonthlyRemaining', String(info.monthly.remaining));
    res.set('X-MonthlyReset', String(info.monthly.resetUnix || info.monthly.resetAt));
  }
}

/**
 * Middleware: after apiKeyAuth. Admits or rejects; attaches req.rateLimit.
 */
async function rateLimit(req, res, next) {
  try {
    if (!req.apiUser?.id) {
      return next(
        new AppError('UNAUTHORIZED', 'Authentication required.', { status: 401 })
      );
    }

    const result = await rateLimiter.checkAndConsume(req.apiUser.id, req.apiUser.plan);
    req.rateLimit = result;
    setRateLimitHeaders(res, result);

    // On finish, log API request (admitted)
    const start = Date.now();
    res.on('finish', () => {
      try {
        const usageLogger = require('../services/usageLogger');
        usageLogger.logApiRequest({
          userId: req.apiUser.id,
          apiKeyId: req.apiUser.apiKeyId,
          operation: req.method,
          cacheKey: req.params?.key || req.params?.[0] || null,
          statusCode: res.statusCode,
          latencyMs: Date.now() - start,
          admitted: true,
        });
      } catch {
        // never throw from finish
      }
    });

    next();
  } catch (err) {
    if (err.rateLimit) {
      setRateLimitHeaders(res, err.rateLimit);
    }
    if (err.retryAfter != null) {
      res.set('Retry-After', String(err.retryAfter));
    }
    if (err.resetAt) {
      // include in body via error handler extension
      err.bodyExtras = { resetAt: err.resetAt };
    }

    // Log rejected admitted=false
    if (req.apiUser?.id && (err.code === 'RATE_LIMIT_EXCEEDED' || err.code === 'MONTHLY_QUOTA_EXCEEDED')) {
      try {
        const usageLogger = require('../services/usageLogger');
        usageLogger.logApiRequest({
          userId: req.apiUser.id,
          apiKeyId: req.apiUser.apiKeyId,
          operation: req.method,
          cacheKey: req.params?.key || null,
          statusCode: 429,
          latencyMs: 0,
          admitted: false,
        });
      } catch {
        /* ignore */
      }
    }
    next(err);
  }
}

module.exports = { rateLimit, setRateLimitHeaders };

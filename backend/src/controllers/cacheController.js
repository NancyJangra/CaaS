const cacheService = require('../services/cacheService');
const { logCacheOutcome } = require('../services/usageLogger');
const {
  validateCacheKey,
  validateTtl,
  validateValue,
} = require('../utils/cacheValidation');
const { AppError } = require('../utils/errors');

/**
 * GET /v1/cache/:key
 */
async function getCache(req, res, next) {
  const start = Date.now();
  try {
    const key = validateCacheKey(req.params.key);
    const userId = req.apiUser.id;

    const result = await cacheService.get(userId, key);
    const latencyMs = Date.now() - start;

    if (!result.hit) {
      logCacheOutcome({ userId, cacheKey: key, outcome: 'miss', latencyMs });
      res.set('X-Cache', 'MISS');
      return res.status(404).json({
        cached: false,
        key,
        message: 'Cache entry not found.',
      });
    }

    logCacheOutcome({ userId, cacheKey: key, outcome: 'hit', latencyMs });
    res.set('X-Cache', 'HIT');
    return res.status(200).json({
      cached: true,
      key,
      value: result.value,
      ttl: result.ttl,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /v1/cache/:key
 */
async function putCache(req, res, next) {
  try {
    const key = validateCacheKey(req.params.key);
    const userId = req.apiUser.id;
    const plan = req.apiUser.plan;

    if (!req.body || typeof req.body !== 'object') {
      throw new AppError('INVALID_REQUEST_BODY', 'Request body must be a JSON object.', {
        status: 400,
        fix: 'Send { "value": ..., "ttl": 300 }.',
      });
    }

    const { serialized, sizeBytes } = validateValue(req.body.value);
    const ttl = validateTtl(req.body.ttl);

    const result = await cacheService.put(
      userId,
      key,
      serialized,
      sizeBytes,
      ttl,
      plan
    );

    res.status(200).json({
      success: true,
      cached: true,
      key,
      ttl: result.ttl,
      message: 'Value successfully cached.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /v1/cache/:key
 */
async function deleteCache(req, res, next) {
  try {
    const key = validateCacheKey(req.params.key);
    const userId = req.apiUser.id;

    const deleted = await cacheService.remove(userId, key);
    if (!deleted) {
      throw new AppError('CACHE_KEY_NOT_FOUND', 'Cache entry not found.', {
        status: 404,
        fix: 'The key may have already expired or been deleted.',
      });
    }

    res.status(200).json({
      success: true,
      deleted: true,
      key,
      message: 'Cache entry deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCache,
  putCache,
  deleteCache,
};

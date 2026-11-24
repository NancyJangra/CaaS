const config = require('../config');
const { AppError } = require('./errors');

/**
 * Validate cache key from URL path.
 * @returns {string} normalized key
 */
function validateCacheKey(key) {
  if (key == null || typeof key !== 'string') {
    throw new AppError('INVALID_CACHE_KEY', 'Cache key is required.', {
      status: 400,
      fix: 'Provide a non-empty cache key in the URL path.',
    });
  }
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    throw new AppError('INVALID_CACHE_KEY', 'Cache key cannot be empty.', {
      status: 400,
      fix: 'Provide a non-empty cache key.',
    });
  }
  if (trimmed.length > config.cache.maxKeyLength) {
    throw new AppError(
      'INVALID_CACHE_KEY',
      `Cache key must be at most ${config.cache.maxKeyLength} characters.`,
      { status: 400 }
    );
  }
  // Reject characters that could break namespacing or look like path traversal
  if (/[\x00-\x1f\x7f]/.test(trimmed) || trimmed.includes('\n') || trimmed.includes('\r')) {
    throw new AppError('INVALID_CACHE_KEY', 'Cache key contains invalid characters.', {
      status: 400,
    });
  }
  return trimmed;
}

/**
 * Validate and normalize TTL (seconds).
 * @returns {number} ttl in seconds
 */
function validateTtl(ttl) {
  if (ttl === undefined || ttl === null || ttl === '') {
    return config.cache.defaultTtlSeconds;
  }
  const n = typeof ttl === 'number' ? ttl : Number(ttl);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new AppError('INVALID_TTL', 'TTL must be a positive integer (seconds).', {
      status: 400,
      fix: 'Provide an integer TTL in seconds, or omit for the default.',
    });
  }
  if (n <= 0) {
    throw new AppError('INVALID_TTL', 'TTL must be greater than zero.', {
      status: 400,
      fix: 'Use a positive TTL in seconds.',
    });
  }
  if (n > config.cache.maxTtlSeconds) {
    throw new AppError(
      'INVALID_TTL',
      `TTL cannot exceed ${config.cache.maxTtlSeconds} seconds.`,
      { status: 400 }
    );
  }
  return n;
}

/**
 * Validate body.value and return { serialized, sizeBytes, parsed }.
 * Accepts any JSON-serializable value (object, array, string, number, boolean, null).
 */
function validateValue(value) {
  if (value === undefined) {
    throw new AppError('INVALID_REQUEST_BODY', 'Request body must include a "value" field.', {
      status: 400,
      fix: 'Send JSON like { "value": { ... }, "ttl": 300 }.',
    });
  }
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new AppError('INVALID_REQUEST_BODY', 'Value must be JSON-serializable.', {
      status: 400,
    });
  }
  const sizeBytes = Buffer.byteLength(serialized, 'utf8');
  if (sizeBytes > config.cache.maxValueBytes) {
    throw new AppError(
      'VALUE_TOO_LARGE',
      `Value exceeds maximum size of ${config.cache.maxValueBytes} bytes.`,
      {
        status: 413,
        fix: 'Reduce the size of the cached value.',
      }
    );
  }
  return { serialized, sizeBytes, parsed: value };
}

module.exports = {
  validateCacheKey,
  validateTtl,
  validateValue,
};

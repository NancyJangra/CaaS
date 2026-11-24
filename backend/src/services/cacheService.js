const redis = require('./redis');
const db = require('../db');
const { buildCacheKey } = require('../utils/redisKeys');
const metadata = require('./cacheMetadata');
const { AppError } = require('../utils/errors');

/**
 * Load max_items for a plan name.
 */
async function getMaxItems(planName) {
  const { rows } = await db.query(
    `SELECT max_items FROM plans WHERE name = $1`,
    [planName]
  );
  if (rows.length === 0) {
    return 1000; // safe default matching free
  }
  return rows[0].max_items;
}

/**
 * GET: read value + remaining TTL.
 * @returns {{ hit: true, value: any, ttl: number } | { hit: false }}
 */
async function get(userId, key) {
  const client = await redis.connect();
  const redisKey = buildCacheKey(userId, key);
  try {
    const [raw, ttl] = await Promise.all([
      client.get(redisKey),
      client.ttl(redisKey),
    ]);
    if (raw === null) {
      return { hit: false };
    }
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw; // non-JSON edge case
    }
    return { hit: true, value, ttl: ttl > 0 ? ttl : null };
  } catch (err) {
    throw new AppError('REDIS_UNAVAILABLE', 'Cache service temporarily unavailable.', {
      status: 503,
      fix: 'Retry in a few seconds.',
    });
  }
}

/**
 * PUT with quota enforcement.
 * Uses a short Redis lock per user to reduce concurrent over-quota races.
 */
async function put(userId, key, serialized, sizeBytes, ttlSeconds, planName) {
  const client = await redis.connect();
  const redisKey = buildCacheKey(userId, key);
  const lockKey = `lock:quota:${userId}`;

  let lockAcquired = false;
  try {
    // Try lock (NX + short expiry)
    const ok = await client.set(lockKey, '1', { NX: true, EX: 5 });
    lockAcquired = ok === 'OK';
    // If we didn't get the lock, still proceed but count live items carefully

    const exists = (await client.exists(redisKey)) === 1;

    if (!exists) {
      const maxItems = await getMaxItems(planName);
      const current = await metadata.countItemsLive(userId);
      if (current >= maxItems) {
        throw new AppError(
          'CACHE_QUOTA_EXCEEDED',
          `You have reached the maximum of ${maxItems} cached items for your plan.`,
          {
            status: 429,
            fix: 'Delete unused keys or upgrade your plan.',
          }
        );
      }
    }

    await client.set(redisKey, serialized, { EX: ttlSeconds });
    await metadata.trackKey(userId, key, sizeBytes);

    return { ttl: ttlSeconds, updated: exists };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('REDIS_UNAVAILABLE', 'Cache service temporarily unavailable.', {
      status: 503,
      fix: 'Retry in a few seconds.',
    });
  } finally {
    if (lockAcquired) {
      await client.del(lockKey).catch(() => {});
    }
  }
}

/**
 * DELETE a single key for this user only.
 */
async function remove(userId, key) {
  const client = await redis.connect();
  const redisKey = buildCacheKey(userId, key);
  try {
    const deleted = await client.del(redisKey);
    await metadata.untrackKey(userId, key);
    return deleted > 0;
  } catch (err) {
    throw new AppError('REDIS_UNAVAILABLE', 'Cache service temporarily unavailable.', {
      status: 503,
      fix: 'Retry in a few seconds.',
    });
  }
}

module.exports = {
  get,
  put,
  remove,
  getMaxItems,
};

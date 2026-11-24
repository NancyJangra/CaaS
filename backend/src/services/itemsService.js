/**
 * Dashboard cached-items listing and management (JWT scope).
 * Uses Redis metadata + live existence/TTL checks.
 */
const redis = require('./redis');
const {
  buildCacheKey,
  buildMetadataSetKey,
  buildMetadataKeyDetails,
} = require('../utils/redisKeys');
const metadata = require('./cacheMetadata');
const config = require('../config');
const { AppError } = require('../utils/errors');
const { validateTtl } = require('../utils/cacheValidation');

/**
 * List live cache items for a user with search + pagination.
 */
async function listItems(userId, { search = '', page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  if (typeof search === 'string' && search.length > 200) {
    throw new AppError('INVALID_SEARCH', 'Search query is too long.', { status: 400 });
  }

  const client = await redis.connect();
  const setKey = buildMetadataSetKey(userId);
  let members = await client.sMembers(setKey);

  // Live filter + cleanup stale
  const live = [];
  const stale = [];
  if (members.length > 0) {
    const pipe = client.multi();
    for (const key of members) {
      pipe.exists(buildCacheKey(userId, key));
      pipe.ttl(buildCacheKey(userId, key));
      pipe.hGetAll(buildMetadataKeyDetails(userId, key));
    }
    const results = await pipe.exec();
    // results: [exists, ttl, hgetall, exists, ttl, hgetall, ...]
    for (let i = 0; i < members.length; i++) {
      const exists = results[i * 3];
      const ttl = results[i * 3 + 1];
      const details = results[i * 3 + 2] || {};
      if (exists === 1) {
        live.push({
          key: members[i],
          size: parseInt(details.size || '0', 10),
          ttlRemaining: ttl > 0 ? ttl : null,
          createdAt: details.created_at || null,
        });
      } else {
        stale.push(members[i]);
      }
    }
    if (stale.length > 0) {
      const cleanup = client.multi();
      for (const key of stale) {
        cleanup.sRem(setKey, key);
        cleanup.del(buildMetadataKeyDetails(userId, key));
      }
      await cleanup.exec();
    }
  }

  // Search
  let filtered = live;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    filtered = live.filter((item) => item.key.toLowerCase().includes(q));
  }

  // Sort allowlist
  const sortMap = {
    key: (a, b) => a.key.localeCompare(b.key),
    size: (a, b) => a.size - b.size,
    ttl: (a, b) => (a.ttlRemaining || 0) - (b.ttlRemaining || 0),
    createdAt: (a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
  };
  const cmp = sortMap[sort] || sortMap.createdAt;
  filtered.sort(cmp);
  if (String(order).toLowerCase() === 'desc') filtered.reverse();

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  return {
    success: true,
    items,
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Update TTL on an existing cache entry (preserve value).
 */
async function updateTtl(userId, key, ttlInput) {
  const ttl = validateTtl(ttlInput);
  const client = await redis.connect();
  const redisKey = buildCacheKey(userId, key);
  const exists = await client.exists(redisKey);
  if (!exists) {
    throw new AppError('CACHE_KEY_NOT_FOUND', 'Cache entry not found.', {
      status: 404,
      fix: 'The key may have expired or been deleted.',
    });
  }
  await client.expire(redisKey, ttl);
  return { success: true, key, ttl };
}

/**
 * Delete one item (dashboard).
 */
async function deleteItem(userId, key) {
  const client = await redis.connect();
  const redisKey = buildCacheKey(userId, key);
  const deleted = await client.del(redisKey);
  await metadata.untrackKey(userId, key);
  if (!deleted) {
    throw new AppError('CACHE_KEY_NOT_FOUND', 'Cache entry not found.', {
      status: 404,
      fix: 'The key may have already expired or been deleted.',
    });
  }
  return { success: true, deleted: true, key };
}

/**
 * Clear all cached items for this user only.
 */
async function clearAll(userId) {
  const client = await redis.connect();
  const setKey = buildMetadataSetKey(userId);
  const members = await client.sMembers(setKey);
  let deletedCount = 0;
  if (members.length > 0) {
    const multi = client.multi();
    for (const key of members) {
      multi.del(buildCacheKey(userId, key));
      multi.del(buildMetadataKeyDetails(userId, key));
    }
    multi.del(setKey);
    const results = await multi.exec();
    // Count successful cache key deletes (every 3rd starting at 0)
    for (let i = 0; i < members.length; i++) {
      if (results[i * 2] > 0) deletedCount += 1;
    }
  }
  return {
    success: true,
    deletedCount,
    message: 'All cached items have been deleted.',
  };
}

module.exports = {
  listItems,
  updateTtl,
  deleteItem,
  clearAll,
};

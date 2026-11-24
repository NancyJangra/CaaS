const redis = require('./redis');
const {
  buildMetadataSetKey,
  buildMetadataKeyDetails,
  buildCacheKey,
} = require('../utils/redisKeys');

/**
 * After a successful PUT: track key in set + store size/created_at.
 */
async function trackKey(userId, key, sizeBytes) {
  const client = await redis.connect();
  const setKey = buildMetadataSetKey(userId);
  const detailsKey = buildMetadataKeyDetails(userId, key);
  const multi = client.multi();
  multi.sAdd(setKey, key);
  multi.hSet(detailsKey, {
    size: String(sizeBytes),
    created_at: new Date().toISOString(),
  });
  await multi.exec();
}

/**
 * After DELETE or when cleaning expired: remove from set + details.
 */
async function untrackKey(userId, key) {
  const client = await redis.connect();
  const setKey = buildMetadataSetKey(userId);
  const detailsKey = buildMetadataKeyDetails(userId, key);
  const multi = client.multi();
  multi.sRem(setKey, key);
  multi.del(detailsKey);
  await multi.exec();
}

/**
 * Current item count for a user (SCARD of metadata set).
 * Note: may include stale members whose cache keys already expired;
 * countItemsLive filters those out when enforcing quota.
 */
async function countItems(userId) {
  const client = await redis.connect();
  return client.sCard(buildMetadataSetKey(userId));
}

/**
 * Count only keys that still exist in the cache namespace.
 * Cleans stale set members as a side effect.
 */
async function countItemsLive(userId) {
  const client = await redis.connect();
  const setKey = buildMetadataSetKey(userId);
  const members = await client.sMembers(setKey);
  if (members.length === 0) return 0;

  let live = 0;
  const stale = [];
  // Pipeline existence checks
  const pipeline = client.multi();
  for (const key of members) {
    pipeline.exists(buildCacheKey(userId, key));
  }
  const results = await pipeline.exec();
  for (let i = 0; i < members.length; i++) {
    if (results[i] === 1) {
      live += 1;
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
  return live;
}

/**
 * Get TTL remaining for a cache key (-2 = missing, -1 = no expiry).
 */
async function getTtl(userId, key) {
  const client = await redis.connect();
  return client.ttl(buildCacheKey(userId, key));
}

module.exports = {
  trackKey,
  untrackKey,
  countItems,
  countItemsLive,
  getTtl,
};

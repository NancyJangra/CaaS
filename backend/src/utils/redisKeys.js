/**
 * Multi-tenant Redis key builders.
 * Never accept userId from the client for authorization.
 */

function buildCacheKey(userId, key) {
  return `cache:${userId}:${key}`;
}

/** Set of cache keys belonging to a user */
function buildMetadataSetKey(userId) {
  return `meta:${userId}`;
}

/** Per-key metadata hash (size, created_at) */
function buildMetadataKeyDetails(userId, key) {
  return `meta:${userId}:key:${key}`;
}

module.exports = {
  buildCacheKey,
  buildMetadataSetKey,
  buildMetadataKeyDetails,
};

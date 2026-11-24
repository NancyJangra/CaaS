const db = require('../db');

/**
 * Fire-and-forget GET hit/miss analytics (usage_events).
 */
function logCacheOutcome({ userId, cacheKey, outcome, latencyMs }) {
  if (outcome !== 'hit' && outcome !== 'miss') return;
  setImmediate(() => {
    db.query(
      `INSERT INTO usage_events (user_id, cache_key, outcome, latency_ms)
       VALUES ($1, $2, $3, $4)`,
      [userId, cacheKey, outcome, latencyMs]
    ).catch((err) => {
      console.error('usageLogger cache outcome error:', err.message);
    });
  });
}

/**
 * Fire-and-forget API request analytics (api_request_events).
 * Covers GET/PUT/DELETE; admitted true/false.
 * Never logs secrets.
 */
function logApiRequest({
  userId,
  apiKeyId = null,
  operation,
  cacheKey = null,
  statusCode = null,
  latencyMs = null,
  admitted = true,
}) {
  if (!userId || !operation) return;
  const op = String(operation).toUpperCase();
  setImmediate(() => {
    db.query(
      `INSERT INTO api_request_events
         (user_id, api_key_id, operation, cache_key, status_code, latency_ms, admitted)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, apiKeyId, op, cacheKey, statusCode, latencyMs, admitted]
    ).catch((err) => {
      console.error('usageLogger api request error:', err.message);
    });
  });
}

module.exports = {
  logCacheOutcome,
  logApiRequest,
};

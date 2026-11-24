/**
 * Prepared for Phase 5 dashboard: GET /api/usage
 */
const planService = require('./planService');
const rateLimiter = require('./rateLimiter');
const cacheMetadata = require('./cacheMetadata');

async function getUsageSummary(userId, planName) {
  const snapshot = await rateLimiter.getUsageSnapshot(userId, planName);
  const itemCount = await cacheMetadata.countItemsLive(userId);

  return {
    plan: {
      name: snapshot.plan.name,
      requestsPerMinute: snapshot.plan.requestsPerMinute,
      requestsPerMonth: snapshot.plan.requestsPerMonth,
      maxItems: snapshot.plan.maxItems,
    },
    usage: {
      minuteUsed: snapshot.minute.used,
      minuteLimit: snapshot.minute.limit,
      minuteRemaining: snapshot.minute.remaining,
      monthlyUsed: snapshot.monthly.used,
      monthlyLimit: snapshot.monthly.limit,
      monthlyRemaining: snapshot.monthly.remaining,
      itemsUsed: itemCount,
      itemsLimit: snapshot.plan.maxItems,
    },
    reset: {
      minute: snapshot.minute.resetAt,
      monthly: snapshot.monthly.resetAt,
    },
  };
}

module.exports = { getUsageSummary };

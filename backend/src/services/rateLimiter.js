/**
 * Sliding-window (per-minute) + calendar-month quota, Redis-backed.
 *
 * Policy: only admitted requests consume quota. Rejected requests do not.
 * Invalid API keys never reach this layer.
 *
 * Fail-closed: if Redis is unavailable, throw REDIS_RATE_LIMITER_UNAVAILABLE (503).
 */
const redis = require('./redis');
const planService = require('./planService');
const { AppError } = require('../utils/errors');

const WINDOW_SECONDS = 60;

/**
 * Sliding window: sorted set of request timestamps.
 * Key: rl:{userId}:minute
 * Score & member: millisecond timestamp of each admitted request.
 * Remove entries older than now - 60s, then ZCARD; if < limit, ZADD.
 */
const SLIDING_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window_ms)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset_ms = 0
  if oldest[2] then
    reset_ms = tonumber(oldest[2]) + window_ms
  else
    reset_ms = now + window_ms
  end
  return {0, count, reset_ms}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window_ms + 1000)
return {1, count + 1, now + window_ms}
`;

/**
 * Monthly calendar counter (UTC YYYYMM).
 * Key: rl:{userId}:month:{YYYYMM}
 * INCR if under limit; else reject without incrementing.
 */
const MONTHLY_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  return {0, current}
end
local next = redis.call('INCR', key)
if next == 1 then
  redis.call('EXPIRE', key, ttl)
end
return {1, next}
`;

function monthKey(userId, d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `rl:${userId}:month:${y}${m}`;
}

function minuteKey(userId) {
  return `rl:${userId}:minute`;
}

/** Seconds until start of next UTC month */
function secondsUntilNextMonth(d = new Date()) {
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0));
  return Math.max(1, Math.ceil((next.getTime() - d.getTime()) / 1000));
}

function nextMonthIso(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0)).toISOString();
}

/**
 * Attempt to admit one request for the user.
 * @returns {{ admitted: true, minute: {...}, monthly: {...} } | throws AppError}
 */
async function checkAndConsume(userId, planName) {
  let client;
  try {
    client = await redis.connect();
  } catch (err) {
    throw new AppError(
      'REDIS_RATE_LIMITER_UNAVAILABLE',
      'Rate limiter temporarily unavailable.',
      { status: 503, fix: 'Retry in a few seconds.' }
    );
  }

  const plan = await planService.getPlanLimits(planName);
  const now = Date.now();
  const windowMs = WINDOW_SECONDS * 1000;
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  let minuteResult;
  try {
    minuteResult = await client.eval(SLIDING_LUA, {
      keys: [minuteKey(userId)],
      arguments: [String(now), String(windowMs), String(plan.requestsPerMinute), member],
    });
  } catch (err) {
    throw new AppError(
      'REDIS_RATE_LIMITER_UNAVAILABLE',
      'Rate limiter temporarily unavailable.',
      { status: 503, fix: 'Retry in a few seconds.' }
    );
  }

  const [admittedMin, usedMin, resetMs] = minuteResult.map(Number);
  const minute = {
    limit: plan.requestsPerMinute,
    used: usedMin,
    remaining: Math.max(0, plan.requestsPerMinute - usedMin),
    resetAt: Math.ceil(resetMs / 1000), // unix seconds
  };

  if (!admittedMin) {
    const retryAfter = Math.max(1, Math.ceil((resetMs - now) / 1000));
    const err = new AppError(
      'RATE_LIMIT_EXCEEDED',
      `You made ${plan.requestsPerMinute} requests this minute. Your current plan allows ${plan.requestsPerMinute}.`,
      {
        status: 429,
        fix: 'Retry after the displayed reset time or upgrade your plan.',
      }
    );
    err.retryAfter = retryAfter;
    err.rateLimit = { minute, monthly: null };
    throw err;
  }

  // Monthly
  const mKey = monthKey(userId);
  const monthTtl = secondsUntilNextMonth() + 86400; // expire shortly after month ends
  let monthlyResult;
  try {
    monthlyResult = await client.eval(MONTHLY_LUA, {
      keys: [mKey],
      arguments: [String(plan.requestsPerMonth), String(monthTtl)],
    });
  } catch (err) {
    // Compensate minute counter: remove the member we just added
    await client.zRem(minuteKey(userId), member).catch(() => {});
    throw new AppError(
      'REDIS_RATE_LIMITER_UNAVAILABLE',
      'Rate limiter temporarily unavailable.',
      { status: 503, fix: 'Retry in a few seconds.' }
    );
  }

  const [admittedMonth, usedMonth] = monthlyResult.map(Number);
  const monthly = {
    limit: plan.requestsPerMonth,
    used: usedMonth,
    remaining: Math.max(0, plan.requestsPerMonth - usedMonth),
    resetAt: nextMonthIso(),
    resetUnix: Math.floor(Date.now() / 1000) + secondsUntilNextMonth(),
  };

  if (!admittedMonth) {
    // Compensate minute: remove this request from the window
    await client.zRem(minuteKey(userId), member).catch(() => {});
    // Recompute minute remaining after compensation
    minute.used = Math.max(0, minute.used - 1);
    minute.remaining = Math.max(0, plan.requestsPerMinute - minute.used);

    const err = new AppError(
      'MONTHLY_QUOTA_EXCEEDED',
      `You have used all ${plan.requestsPerMonth} requests available for this month.`,
      {
        status: 429,
        fix: 'Wait until your monthly quota resets or upgrade your plan.',
      }
    );
    err.retryAfter = secondsUntilNextMonth();
    err.resetAt = monthly.resetAt;
    err.rateLimit = { minute, monthly };
    throw err;
  }

  return {
    admitted: true,
    minute,
    monthly,
    plan,
  };
}

/**
 * Read current usage without consuming (for dashboard / headers on non-limited paths).
 */
async function getUsageSnapshot(userId, planName) {
  const client = await redis.connect();
  const plan = await planService.getPlanLimits(planName);
  const now = Date.now();
  const windowMs = WINDOW_SECONDS * 1000;
  const mKey = minuteKey(userId);

  await client.zRemRangeByScore(mKey, 0, now - windowMs);
  const usedMin = await client.zCard(mKey);
  const oldest = await client.zRange(mKey, 0, 0, { WITHSCORES: true });
  let resetMs = now + windowMs;
  if (oldest && oldest.length > 0) {
    const score = typeof oldest[0] === 'object' ? oldest[0].score : null;
    // node-redis v4 returns array of {value, score} or flat depending on version
  }
  // Safer: approximate reset as now + window
  const usedMonth = parseInt((await client.get(monthKey(userId))) || '0', 10);

  return {
    plan,
    minute: {
      limit: plan.requestsPerMinute,
      used: usedMin,
      remaining: Math.max(0, plan.requestsPerMinute - usedMin),
      resetAt: Math.ceil((now + windowMs) / 1000),
    },
    monthly: {
      limit: plan.requestsPerMonth,
      used: usedMonth,
      remaining: Math.max(0, plan.requestsPerMonth - usedMonth),
      resetAt: nextMonthIso(),
      resetUnix: Math.floor(now / 1000) + secondsUntilNextMonth(),
    },
  };
}

module.exports = {
  checkAndConsume,
  getUsageSnapshot,
  WINDOW_SECONDS,
  monthKey,
  minuteKey,
};

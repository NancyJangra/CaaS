const db = require('../db');
const { AppError } = require('../utils/errors');

// Short in-process cache for plan rows (plan changes are rare)
const planCache = new Map();
const PLAN_CACHE_TTL_MS = 60_000;

async function getPlanLimits(planName) {
  const cached = planCache.get(planName);
  if (cached && Date.now() - cached.at < PLAN_CACHE_TTL_MS) {
    return cached.plan;
  }
  const { rows } = await db.query(
    `SELECT name, requests_per_minute, requests_per_month, max_items
     FROM plans WHERE name = $1`,
    [planName]
  );
  if (rows.length === 0) {
    throw new AppError('PLAN_NOT_FOUND', `Plan "${planName}" was not found.`, {
      status: 500,
      fix: 'Contact support.',
    });
  }
  const plan = {
    name: rows[0].name,
    requestsPerMinute: rows[0].requests_per_minute,
    requestsPerMonth: Number(rows[0].requests_per_month),
    maxItems: rows[0].max_items,
  };
  planCache.set(planName, { plan, at: Date.now() });
  return plan;
}

async function getUserPlan(userId) {
  const { rows } = await db.query(`SELECT plan FROM users WHERE id = $1`, [userId]);
  if (rows.length === 0) {
    throw new AppError('UNAUTHORIZED', 'User not found.', { status: 401 });
  }
  return getPlanLimits(rows[0].plan);
}

function clearPlanCache() {
  planCache.clear();
}

module.exports = {
  getPlanLimits,
  getUserPlan,
  clearPlanCache,
};

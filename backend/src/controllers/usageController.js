const { getUsageSummary } = require('../services/usageService');

async function getUsage(req, res, next) {
  try {
    const summary = await getUsageSummary(req.user.id, req.user.plan);
    res.json({
      success: true,
      plan: summary.plan,
      usage: {
        minuteUsed: summary.usage.minuteUsed,
        minuteLimit: summary.usage.minuteLimit,
        minuteRemaining: summary.usage.minuteRemaining,
        monthlyUsed: summary.usage.monthlyUsed,
        monthlyLimit: summary.usage.monthlyLimit,
        monthlyRemaining: summary.usage.monthlyRemaining,
        cachedItems: summary.usage.itemsUsed,
        maxItems: summary.usage.itemsLimit,
      },
      reset: summary.reset,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUsage };

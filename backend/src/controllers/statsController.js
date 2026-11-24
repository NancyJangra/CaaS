const { getStats } = require('../services/statsService');

async function getDashboardStats(req, res, next) {
  try {
    const range = req.query.range || '24h';
    const data = await getStats(req.user.id, range);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats };

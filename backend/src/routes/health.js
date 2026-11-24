const express = require('express');
const db = require('../db');
const redis = require('../services/redis');

const router = express.Router();

/**
 * GET /health
 * Basic process health – always returns 200 if the server is up.
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'caas-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/db
 * Checks PostgreSQL connectivity.
 */
router.get('/db', async (req, res, next) => {
  try {
    const result = await db.checkConnection();
    if (result.ok) {
      res.json({
        status: 'ok',
        service: 'postgresql',
        latencyMs: result.latencyMs,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'error',
        service: 'postgresql',
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /health/redis
 * Checks Redis connectivity.
 */
router.get('/redis', async (req, res, next) => {
  try {
    const result = await redis.checkConnection();
    if (result.ok) {
      res.json({
        status: 'ok',
        service: 'redis',
        latencyMs: result.latencyMs,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'error',
        service: 'redis',
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimit } = require('../middleware/rateLimit');
const cacheController = require('../controllers/cacheController');

const router = express.Router();

// Order: API key auth → rate limiter → controller
router.use(apiKeyAuth);
router.use(rateLimit);

router.get('/*', (req, res, next) => {
  req.params.key = req.params[0];
  return cacheController.getCache(req, res, next);
});

router.put('/*', (req, res, next) => {
  req.params.key = req.params[0];
  return cacheController.putCache(req, res, next);
});

router.delete('/*', (req, res, next) => {
  req.params.key = req.params[0];
  return cacheController.deleteCache(req, res, next);
});

module.exports = router;

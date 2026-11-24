const express = require('express');
const { requireAuth } = require('../middleware/auth');
const userController = require('../controllers/userController');
const apiKeyController = require('../controllers/apiKeyController');
const usageController = require('../controllers/usageController');
const statsController = require('../controllers/statsController');
const itemsController = require('../controllers/itemsController');

const router = express.Router();

router.use(requireAuth);

router.get('/me', userController.getMe);
router.get('/keys', apiKeyController.listKeys);
router.post('/keys', apiKeyController.createKey);
router.delete('/keys/:id', apiKeyController.revokeKey);
router.get('/usage', usageController.getUsage);
router.get('/stats', statsController.getDashboardStats);

// Cached items — clear-all before parameterized routes
router.get('/items', itemsController.listItems);
router.delete('/items', itemsController.deleteAll);
// key may contain colons — use wildcard
router.patch('/items/*', (req, res, next) => {
  req.params.key = req.params[0];
  return itemsController.patchItem(req, res, next);
});
router.delete('/items/*', (req, res, next) => {
  req.params.key = req.params[0];
  return itemsController.deleteOne(req, res, next);
});

module.exports = router;

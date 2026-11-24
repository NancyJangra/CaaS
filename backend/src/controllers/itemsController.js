const itemsService = require('../services/itemsService');
const { validateCacheKey } = require('../utils/cacheValidation');
const { AppError } = require('../utils/errors');

async function listItems(req, res, next) {
  try {
    const result = await itemsService.listItems(req.user.id, {
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      order: req.query.order,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function patchItem(req, res, next) {
  try {
    const key = validateCacheKey(req.params.key);
    if (req.body?.ttl === undefined) {
      throw new AppError('INVALID_TTL', 'Request body must include "ttl".', {
        status: 400,
        fix: 'Send { "ttl": 3600 }.',
      });
    }
    const result = await itemsService.updateTtl(req.user.id, key, req.body.ttl);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteOne(req, res, next) {
  try {
    const key = validateCacheKey(req.params.key);
    const result = await itemsService.deleteItem(req.user.id, key);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteAll(req, res, next) {
  try {
    const result = await itemsService.clearAll(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listItems, patchItem, deleteOne, deleteAll };

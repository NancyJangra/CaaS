function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);
  } else {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}: ${err.message}`);
  }

  const body = {
    code: err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR'),
    message: err.message || 'An unexpected error occurred',
  };

  if (err.fix) body.fix = err.fix;
  if (err.docsUrl) body.docsUrl = err.docsUrl;
  if (err.bodyExtras && typeof err.bodyExtras === 'object') {
    Object.assign(body, err.bodyExtras);
  }
  if (err.resetAt) body.resetAt = err.resetAt;

  if (!isProduction && err.stack) {
    body.stack = err.stack.split('\n').slice(0, 5);
  }

  res.status(status).json(body);
}

function notFoundHandler(req, res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  err.code = 'NOT_FOUND';
  next(err);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};

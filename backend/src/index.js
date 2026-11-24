const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const config = require('./config');
const redis = require('./services/redis');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const cacheRoutes = require('./routes/cache');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/v1/cache', cacheRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'Cache-as-a-Service API',
    version: '1.0.0',
    status: 'Phase 3 — Redis caching engine',
    docs: '/health',
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await redis.connect();
    console.log('Redis connected');

    const server = app.listen(config.port, () => {
      console.log(`CaaS backend listening on http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Health: http://localhost:${config.port}/health`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down...`);
      server.close(async () => {
        await redis.quit();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;

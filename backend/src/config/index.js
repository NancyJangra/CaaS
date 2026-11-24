require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  database: {
    url: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT, 10) || 5432,
    user: process.env.PGUSER || 'caas',
    password: process.env.PGPASSWORD || 'caas_secret',
    database: process.env.PGDATABASE || 'caas',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-change-me-in-production-use-long-random-string',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: process.env.JWT_ISSUER || 'caas-api',
    audience: process.env.JWT_AUDIENCE || 'caas-dashboard',
  },

  cookie: {
    name: process.env.COOKIE_NAME || 'caas_token',
    maxAgeMs: parseInt(process.env.COOKIE_MAX_AGE_MS, 10) || 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  },

  auth: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    minPasswordLength: parseInt(process.env.MIN_PASSWORD_LENGTH, 10) || 8,
    maxPasswordLength: parseInt(process.env.MAX_PASSWORD_LENGTH, 10) || 128,
    loginRateLimit: {
      windowSeconds: parseInt(process.env.LOGIN_RATE_WINDOW_SEC, 10) || 15 * 60,
      maxAttempts: parseInt(process.env.LOGIN_RATE_MAX_ATTEMPTS, 10) || 10,
    },
  },

  cache: {
    defaultTtlSeconds: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300,
    maxTtlSeconds: parseInt(process.env.CACHE_MAX_TTL, 10) || 86400 * 30, // 30 days
    maxValueBytes: parseInt(process.env.CACHE_MAX_VALUE_BYTES, 10) || 1024 * 1024, // 1 MB
    maxKeyLength: parseInt(process.env.CACHE_MAX_KEY_LENGTH, 10) || 256,
  },
};

module.exports = config;

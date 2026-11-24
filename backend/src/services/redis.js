const { createClient } = require('redis');
const config = require('../config');

let client = null;

/**
 * Get or create the Redis client (singleton)
 */
function getClient() {
  if (client) return client;

  client = createClient({
    url: config.redis.url,
    socket: {
      host: config.redis.host,
      port: config.redis.port,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err.message);
  });

  client.on('connect', () => {
    console.log('Redis: connecting...');
  });

  client.on('ready', () => {
    console.log('Redis: ready');
  });

  return client;
}

/**
 * Connect to Redis if not already connected
 */
async function connect() {
  const c = getClient();
  if (!c.isOpen) {
    await c.connect();
  }
  return c;
}

/**
 * Test Redis connectivity
 * @returns {Promise<{ok: boolean, latencyMs?: number, error?: string}>}
 */
async function checkConnection() {
  const start = Date.now();
  try {
    const c = await connect();
    const pong = await c.ping();
    if (pong !== 'PONG') {
      return { ok: false, error: `Unexpected PING response: ${pong}` };
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Gracefully close the Redis connection
 */
async function quit() {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
  }
}

module.exports = {
  getClient,
  connect,
  checkConnection,
  quit,
};

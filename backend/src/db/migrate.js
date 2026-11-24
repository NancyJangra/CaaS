/**
 * Simple migration runner. Idempotent SQL files in src/migrations/.
 * Usage: node src/db/migrate.js
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function migrate() {
  const dir = path.join(__dirname, '../migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`Running migration: ${file}`);
      await client.query(sql);
      console.log(`  OK: ${file}`);
    }
    console.log('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

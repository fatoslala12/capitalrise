const { Pool } = require('pg');

// Optimized connection pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Connection pool optimizations
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection on startup
(async () => {
  console.log('[INIT] Duke testuar lidhjen me databazën...');

  try {
    const client = await pool.connect();
    console.log('✅ Lidhja me databazën u realizua me sukses!');
    await client.query('SELECT 1'); // thjesht një test minimal
    client.release();
  } catch (err) {
    console.error('❌ Gabim gjatë lidhjes me databazën:', err);
  }
})();

module.exports = pool;

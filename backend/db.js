const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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

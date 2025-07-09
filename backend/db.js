const { Pool } = require('pg');

console.log("[INIT] Duke krijuar lidhjen me databazën...");
console.log("[INIT] DATABASE_URL nga process.env:", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Provojmë një query të thjeshtë për të testuar lidhjen
(async () => {
  try {
    console.log("[CHECK] Duke testuar lidhjen me databazën me 'SELECT 1'...");
    const result = await pool.query("SELECT 1");
    console.log("[CHECK] Lidhja me databazën funksionon ✔️", result.rows);
  } catch (err) {
    console.error("[ERROR] Lidhja me databazën dështoi ❌");
    console.error(err);
  }
})();

module.exports = pool;

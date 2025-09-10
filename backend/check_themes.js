const { pool } = require('./db');

(async () => {
  try {
    const result = await pool.query('SELECT id, name, colors, is_public FROM custom_themes ORDER BY created_at DESC');
    console.log('Custom themes:');
    result.rows.forEach(theme => {
      console.log(`- ID: ${theme.id}, Name: ${theme.name}, Public: ${theme.is_public}`);
      if (theme.name === 'test1') {
        console.log('  Colors:', JSON.stringify(theme.colors, null, 2));
      }
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

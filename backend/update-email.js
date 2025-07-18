const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://fatoslala12:your_password@ep-cool-forest-a5qj8qj8.us-east-2.aws.neon.tech/building-system?sslmode=require'
});

async function updateEmail() {
  try {
    const result = await pool.query(
      'UPDATE users SET email = $1 WHERE email = $2 RETURNING id, email, first_name, last_name',
      ['fatoslala12@gmail.com', 'admin@gmail.com']
    );
    console.log('Email updated successfully:', result.rows[0]);
  } catch (error) {
    console.error('Error updating email:', error);
  } finally {
    await pool.end();
  }
}

updateEmail(); 
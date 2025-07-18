const { Pool } = require('pg');

// Konfigurimi i databazës - përdor Neon DB
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_vzOic6bTHB5o@ep-shy-truth-a2p7hce5-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  try {
    console.log('🔍 Duke kontrolluar përdoruesit në databazë...');
    
    // Kontrollo nëse tabela users ekziston
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Tabela users nuk ekziston!');
      return;
    }

    // Merr të gjithë përdoruesit
    const users = await pool.query('SELECT id, email, name, role FROM users ORDER BY id');
    
    console.log(`\n📋 Gjetën ${users.rows.length} përdorues:`);
    users.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}`);
    });

    // Kontrollo specifikisht admin
    const adminUser = await pool.query('SELECT id, email, name, role FROM users WHERE email = $1', ['admin@gmail.com']);
    
    if (adminUser.rows.length > 0) {
      console.log(`\n✅ Përdoruesi admin u gjet:`);
      console.log(`   - ID: ${adminUser.rows[0].id}`);
      console.log(`   - Email: ${adminUser.rows[0].email}`);
      console.log(`   - Name: ${adminUser.rows[0].name}`);
      console.log(`   - Role: ${adminUser.rows[0].role}`);
    } else {
      console.log('\n❌ Përdoruesi admin@gmail.com nuk u gjet!');
    }

  } catch (error) {
    console.error('❌ Gabim:', error.message);
  } finally {
    await pool.end();
    console.log('\n🔚 Lidhja me databazën u mbyll.');
  }
}

checkUsers(); 
const pool = require('./db');

async function testUsersTable() {
  try {
    console.log('🔍 Duke kontrolluar strukturën e tabelës users...');
    
    // Kontrollo strukturën aktuale
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Struktura aktuale e tabelës users:');
    structureResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Kontrollo nëse ka të dhëna
    const dataResult = await pool.query(`
      SELECT id, email, first_name, last_name, role, employee_id, status 
      FROM users 
      LIMIT 3
    `);
    
    console.log('\n📊 Të dhënat ekzistuese:');
    dataResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Email: ${row.email}, Name: ${row.first_name} ${row.last_name}, Role: ${row.role}`);
    });
    
    // Test shtimin e një user të ri
    console.log('\n🧪 Duke testuar shtimin e një user të ri...');
    
    const testUser = {
      email: 'test@example.com',
      password: '12345678',
      role: 'user',
      employee_id: null,
      first_name: 'Test',
      last_name: 'User'
    };
    
    // Kontrollo nëse test user ekziston
    const existingCheck = await pool.query('SELECT id FROM users WHERE email = $1', [testUser.email]);
    if (existingCheck.rows.length > 0) {
      console.log('⚠️ Test user ekziston tashmë, duke e fshirë...');
      await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    }
    
    // Shto test user
    const insertResult = await pool.query(`
      INSERT INTO users (email, password, role, employee_id, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [testUser.email, testUser.password, testUser.role, testUser.employee_id, testUser.first_name, testUser.last_name]);
    
    console.log('✅ Test user u shtua me sukses:', insertResult.rows[0]);
    
    // Fshi test user
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    console.log('🗑️ Test user u fshi');
    
    console.log('\n🎉 Testi u krye me sukses! Tabela users është gati për përdorim.');
    
  } catch (error) {
    console.error('❌ Gabim gjatë testit:', error);
  } finally {
    await pool.end();
  }
}

testUsersTable();
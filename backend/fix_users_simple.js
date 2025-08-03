const pool = require('./db');

async function fixUsersTable() {
  try {
    console.log('🔧 Duke shtuar kolonat e munguara në tabelën users...');
    
    // Shto kolonat një nga një
    const commands = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS start_date DATE",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS next_of_kin VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS next_of_kin_phone VARCHAR(50)"
    ];
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n🔄 Ekzekutimi i komandës ${i + 1}/${commands.length}: ${command}`);
      
      try {
        await pool.query(command);
        console.log(`✅ Komanda ${i + 1} u ekzekutua me sukses`);
      } catch (error) {
        console.log(`⚠️ Komanda ${i + 1} dështoi:`, error.message);
      }
    }
    
    // Përditëso të dhënat ekzistuese
    console.log('\n🔄 Duke përditësuar të dhënat ekzistuese...');
    
    try {
      await pool.query("UPDATE users SET first_name = 'User' WHERE first_name IS NULL");
      console.log('✅ first_name u përditësua');
    } catch (error) {
      console.log('⚠️ first_name update dështoi:', error.message);
    }
    
    try {
      await pool.query("UPDATE users SET last_name = 'User' WHERE last_name IS NULL");
      console.log('✅ last_name u përditësua');
    } catch (error) {
      console.log('⚠️ last_name update dështoi:', error.message);
    }
    
    try {
      await pool.query("UPDATE users SET status = 'active' WHERE status IS NULL");
      console.log('✅ status u përditësua');
    } catch (error) {
      console.log('⚠️ status update dështoi:', error.message);
    }
    
    // Bëj kolonat NOT NULL
    console.log('\n🔄 Duke bërë kolonat NOT NULL...');
    
    try {
      await pool.query("ALTER TABLE users ALTER COLUMN first_name SET NOT NULL");
      console.log('✅ first_name u bë NOT NULL');
    } catch (error) {
      console.log('⚠️ first_name NOT NULL dështoi:', error.message);
    }
    
    try {
      await pool.query("ALTER TABLE users ALTER COLUMN last_name SET NOT NULL");
      console.log('✅ last_name u bë NOT NULL');
    } catch (error) {
      console.log('⚠️ last_name NOT NULL dështoi:', error.message);
    }
    
    try {
      await pool.query("ALTER TABLE users ALTER COLUMN status SET NOT NULL");
      console.log('✅ status u bë NOT NULL');
    } catch (error) {
      console.log('⚠️ status NOT NULL dështoi:', error.message);
    }
    
    // Kontrollo strukturën e re
    console.log('\n🔍 Duke kontrolluar strukturën e re...');
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Struktura e re e tabelës users:');
    structureResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Testo shtimin e një user të ri
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
    
    console.log('\n🎉 Fix-i për tabelën users u përfundua me sukses!');
    
  } catch (error) {
    console.error('❌ Gabim gjatë fix-it:', error);
  } finally {
    await pool.end();
  }
}

fixUsersTable();
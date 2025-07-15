const pool = require('./db');

async function updateTasksSchema() {
  console.log('🔄 Duke përditësuar skemën e tabelës tasks...');
  
  try {
    // 1. Shto kolonën priority
    console.log('📝 Duke shtuar kolonën priority...');
    await pool.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))
    `);
    console.log('✅ Kolona priority u shtua me sukses!');

    // 2. Shto kolonën category
    console.log('📝 Duke shtuar kolonën category...');
    await pool.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'construction', 'maintenance', 'cleaning', 'safety', 'admin'))
    `);
    console.log('✅ Kolona category u shtua me sukses!');

    // 3. Përditëso detyrat ekzistuese me vlera default
    console.log('🔄 Duke përditësuar detyrat ekzistuese...');
    await pool.query(`
      UPDATE tasks 
      SET priority = 'medium' 
      WHERE priority IS NULL
    `);
    
    await pool.query(`
      UPDATE tasks 
      SET category = 'general' 
      WHERE category IS NULL
    `);
    console.log('✅ Detyrat ekzistuese u përditësuan!');

    // 4. Bëj kolonat NOT NULL
    console.log('🔒 Duke bërë kolonat NOT NULL...');
    await pool.query(`
      ALTER TABLE tasks 
      ALTER COLUMN priority SET NOT NULL
    `);
    
    await pool.query(`
      ALTER TABLE tasks 
      ALTER COLUMN category SET NOT NULL
    `);
    console.log('✅ Kolonat u bënë NOT NULL!');

    // 5. Verifikimi
    console.log('🔍 Duke verifikuar strukturën e re...');
    const result = await pool.query(`
      SELECT 
          column_name, 
          data_type, 
          column_default, 
          is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tasks' 
        AND column_name IN ('priority', 'category')
      ORDER BY column_name
    `);
    
    console.log('📊 Struktura e re:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}, Default: ${row.column_default}, Nullable: ${row.is_nullable}`);
    });

    // 6. Kontrollo disa rreshta
    console.log('📋 Kontrollo disa rreshta:');
    const sampleData = await pool.query(`
      SELECT id, title, priority, category, created_at 
      FROM tasks 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    sampleData.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Title: ${row.title}, Priority: ${row.priority}, Category: ${row.category}`);
    });

    console.log('🎉 Përditësimi i skemës u krye me sukses!');
    
  } catch (error) {
    console.error('❌ Gabim gjatë përditësimit të skemës:', error);
  } finally {
    await pool.end();
  }
}

// Ekzekuto script-in
updateTasksSchema(); 
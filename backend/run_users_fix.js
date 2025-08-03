const pool = require('./db');
const fs = require('fs');

async function runUsersFix() {
  try {
    console.log('🔧 Duke ekzekutuar fix për tabelën users...');
    
    // Lexo SQL file
    const sqlContent = fs.readFileSync('./add_users_columns.sql', 'utf8');
    
    // Ndaj në komanda të veçanta
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Gjetën ${commands.length} komanda për ekzekutim`);
    
    // Ekzekuto çdo komandë
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n🔄 Ekzekutimi i komandës ${i + 1}/${commands.length}...`);
      
      try {
        const result = await pool.query(command);
        console.log(`✅ Komanda ${i + 1} u ekzekutua me sukses`);
        
        // Nëse ka rezultate, shfaqi ato
        if (result.rows && result.rows.length > 0) {
          console.log('📊 Rezultatet:');
          result.rows.forEach((row, idx) => {
            console.log(`  ${idx + 1}.`, row);
          });
        }
      } catch (error) {
        console.log(`⚠️ Komanda ${i + 1} dështoi:`, error.message);
        // Vazhdo me komandën tjetër
      }
    }
    
    console.log('\n🎉 Fix-i për tabelën users u përfundua!');
    
    // Testo strukturën e re
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
    
  } catch (error) {
    console.error('❌ Gabim gjatë ekzekutimit të fix-it:', error);
  } finally {
    await pool.end();
  }
}

runUsersFix();
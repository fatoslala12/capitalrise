const { pool } = require('./db');
const fs = require('fs').promises;
const path = require('path');

async function runInvoiceEmailMigration() {
  console.log('🚀 Filloj migracionin për email tracking të faturave...');
  
  try {
    // Lexo file-in e migracionit SQL
    const sqlFile = path.join(__dirname, 'add_invoice_emailed_field.sql');
    const migrationSQL = await fs.readFile(sqlFile, 'utf8');
    
    // Ekzekuto të gjitha kommandat SQL
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const command of commands) {
      console.log('⚡ Duke ekzekutuar:', command.substring(0, 100) + '...');
      await pool.query(command);
    }
    
    console.log('✅ Migrimi u përfundua me sukses!');
    console.log('');
    console.log('📋 Përmbledhje e ndryshimeve:');
    console.log('  • U shtua kolona "emailed" (BOOLEAN) në tabelën invoices');
    console.log('  • U shtua kolona "emailed_at" (TIMESTAMP) në tabelën invoices');
    console.log('  • U krijua indeks për performancë më të mirë');
    console.log('  • Të gjitha faturat ekzistuese u vendosën si emailed = false');
    console.log('');
    
    // Verifikimi final
    const result = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND column_name IN ('emailed', 'emailed_at')
      ORDER BY column_name
    `);
    
    console.log('🔍 Verifikim i strukturës së re:');
    result.rows.forEach(row => {
      console.log(`  • ${row.column_name}: ${row.data_type} (Default: ${row.column_default || 'NULL'}, Nullable: ${row.is_nullable})`);
    });
    
    // Numro faturat që janë të konfigururara aktualisht
    const invoiceCount = await pool.query('SELECT COUNT(*) as count FROM invoices');
    console.log(`\n📊 Gjithsej ${invoiceCount.rows[0].count} fatura në sistem`);
    
    console.log('\n🎉 Migrimi u kompletua! Sistemi tani mund të gjurmojë statusin e email-eve të faturave.');
    
  } catch (error) {
    console.error('❌ Gabim gjatë migracionit:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ekzekuto migracionin
if (require.main === module) {
  runInvoiceEmailMigration();
}

module.exports = runInvoiceEmailMigration;

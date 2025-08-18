const { pool } = require('./db');
const fs = require('fs').promises;
const path = require('path');

async function runWorkHoursAmountsMigration() {
  console.log('🚀 Filloj migracionin për amounts në work_hours...');
  
  try {
    // Lexo file-in e migracionit SQL
    const sqlFile = path.join(__dirname, 'add_work_hours_amounts.sql');
    const migrationSQL = await fs.readFile(sqlFile, 'utf8');
    
    // Ekzekuto të gjitha kommandat SQL
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`⚡ Gjetur ${commands.length} kommanda SQL për ekzekutim...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.toLowerCase().includes('select')) {
        // For SELECT commands, show results
        console.log(`📊 Duke ekzekutuar query ${i + 1}:`, command.substring(0, 80) + '...');
        const result = await pool.query(command);
        if (result.rows && result.rows.length > 0) {
          console.log('📋 Rezultatet:');
          console.table(result.rows);
        } else {
          console.log('📋 S\'ka rezultate.');
        }
      } else {
        console.log(`⚡ Duke ekzekutuar komandën ${i + 1}:`, command.substring(0, 80) + '...');
        await pool.query(command);
        console.log('✅ U ekzekutua me sukses.');
      }
    }
    
    console.log('\n🎉 Migrimi u përfundua me sukses!');
    console.log('');
    console.log('📋 Përmbledhje e ndryshimeve:');
    console.log('  • U shtuan fushat gross_amount dhe net_amount në work_hours');
    console.log('  • U shtua fusha employee_type për të ruajtur NI/UTR status');
    console.log('  • U kalkuluan amounts për të gjitha work hours ekzistuese');
    console.log('  • U krijuan indekse për performancë më të mirë');
    console.log('');
    
    // Test final - merr disa statistika
    console.log('📊 Statistika finale:');
    const totalStats = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN employee_type = 'NI' THEN 1 END) as ni_entries,
        COUNT(CASE WHEN employee_type = 'UTR' THEN 1 END) as utr_entries,
        SUM(hours) as total_hours,
        SUM(gross_amount) as total_gross,
        SUM(net_amount) as total_net,
        AVG(rate) as avg_rate
      FROM work_hours
      WHERE gross_amount > 0
    `);
    
    if (totalStats.rows.length > 0) {
      const stats = totalStats.rows[0];
      console.log(`   📈 Total entries: ${stats.total_entries}`);
      console.log(`   👷 NI employees: ${stats.ni_entries}`);
      console.log(`   🏢 UTR employees: ${stats.utr_entries}`);
      console.log(`   ⏰ Total hours: ${parseFloat(stats.total_hours || 0).toFixed(1)}`);
      console.log(`   💰 Total gross: £${parseFloat(stats.total_gross || 0).toFixed(2)}`);
      console.log(`   💵 Total net: £${parseFloat(stats.total_net || 0).toFixed(2)}`);
      console.log(`   📊 Average rate: £${parseFloat(stats.avg_rate || 0).toFixed(2)}/hour`);
    }
    
    console.log('\n✅ Work Hours Amounts Migration u kompletua!');
    console.log('🔧 Backend-i është përditësuar për të kalkuluar amounts automatikisht.');
    console.log('📱 Frontend-i duhet të rifreskohet për të treguar amounts e reja.');
    
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
  runWorkHoursAmountsMigration();
}

module.exports = runWorkHoursAmountsMigration;

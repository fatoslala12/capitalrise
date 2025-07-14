const pool = require('./db');

async function testDatabase() {
  try {
    console.log('🔍 Testimi i lidhjes me databazën...');
    
    // Test lidhjen
    const client = await pool.connect();
    console.log('✅ Lidhja me databazën u krye me sukses!');
    
    // Kontrollo përdoruesit
    const usersResult = await client.query('SELECT id, email, firstname, lastname, role FROM public.users LIMIT 5');
    console.log('👥 Përdoruesit në databazë:');
    console.log(usersResult.rows);
    
    // Kontrollo kontratat
    const contractsResult = await client.query('SELECT COUNT(*) as count FROM public.contracts');
    console.log('📋 Numri i kontratave:', contractsResult.rows[0].count);
    
    // Kontrollo punonjësit
    const employeesResult = await client.query('SELECT COUNT(*) as count FROM public.employees');
    console.log('👷 Numri i punonjësve:', employeesResult.rows[0].count);
    
    client.release();
  } catch (error) {
    console.error('❌ Gabim në testimin e databazës:', error);
  } finally {
    await pool.end();
  }
}

testDatabase(); 
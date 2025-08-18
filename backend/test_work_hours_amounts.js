const { pool } = require('./db');

async function testWorkHoursAmounts() {
  console.log('🧪 Testoj sistemin e amount tracking për work hours...');
  
  try {
    // 1. Kontrollo nëse kolonat e reja ekzistojnë
    console.log('\n1️⃣ Kontrolloj strukturën e tabelës...');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'work_hours' 
      AND column_name IN ('gross_amount', 'net_amount', 'employee_type')
      ORDER BY column_name
    `);
    
    if (columnCheck.rows.length === 3) {
      console.log('✅ Kolonat e reja janë në vend:');
      columnCheck.rows.forEach(row => {
        console.log(`   • ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('❌ Kolonat e reja nuk janë gjetur! Duhet të ekzekutohet migrimi fillimisht.');
      console.log(`Gjetur ${columnCheck.rows.length}/3 kolona të nevojshme.`);
      return;
    }
    
    // 2. Kontrollo statistikat aktuale
    console.log('\n2️⃣ Kontrolloj statistikat aktuale...');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN employee_type = 'NI' THEN 1 END) as ni_entries,
        COUNT(CASE WHEN employee_type = 'UTR' THEN 1 END) as utr_entries,
        COUNT(CASE WHEN gross_amount > 0 THEN 1 END) as entries_with_gross,
        COUNT(CASE WHEN net_amount > 0 THEN 1 END) as entries_with_net,
        SUM(hours) as total_hours,
        SUM(gross_amount) as total_gross,
        SUM(net_amount) as total_net,
        AVG(rate) as avg_rate
      FROM work_hours
    `);
    
    const data = stats.rows[0];
    console.log(`   📊 Total entries: ${data.total_entries}`);
    console.log(`   👷 NI employees: ${data.ni_entries}`);
    console.log(`   🏢 UTR employees: ${data.utr_entries}`);
    console.log(`   💰 Entries with gross amount: ${data.entries_with_gross}`);
    console.log(`   💵 Entries with net amount: ${data.entries_with_net}`);
    console.log(`   ⏰ Total hours: ${parseFloat(data.total_hours || 0).toFixed(1)}`);
    console.log(`   💷 Total gross: £${parseFloat(data.total_gross || 0).toFixed(2)}`);
    console.log(`   💸 Total net: £${parseFloat(data.total_net || 0).toFixed(2)}`);
    console.log(`   📈 Average rate: £${parseFloat(data.avg_rate || 0).toFixed(2)}/hour`);
    
    // 3. Testo nëse kalkulimi është i saktë
    console.log('\n3️⃣ Testoj saktësinë e kalkulimeve...');
    const sampleData = await pool.query(`
      SELECT 
        wh.id,
        wh.hours,
        wh.rate as work_rate,
        e.hourly_rate as emp_rate,
        wh.gross_amount,
        wh.net_amount,
        wh.employee_type,
        e.label_type as emp_label_type
      FROM work_hours wh
      LEFT JOIN employees e ON wh.employee_id = e.id
      WHERE wh.hours > 0
      ORDER BY wh.id DESC
      LIMIT 5
    `);
    
    console.log('📋 Sample work hours (top 5):');
    sampleData.rows.forEach((row, index) => {
      const expectedRate = row.work_rate || row.emp_rate || 15;
      const expectedGross = row.hours * expectedRate;
      const expectedNet = row.employee_type === 'NI' ? expectedGross * 0.70 : expectedGross * 0.80;
      
      console.log(`\n   Entry ${index + 1} (ID: ${row.id}):`);
      console.log(`     Hours: ${row.hours}, Rate: £${expectedRate}`);
      console.log(`     Expected: £${expectedGross.toFixed(2)} gross, £${expectedNet.toFixed(2)} net (${row.employee_type})`);
      console.log(`     Actual:   £${parseFloat(row.gross_amount || 0).toFixed(2)} gross, £${parseFloat(row.net_amount || 0).toFixed(2)} net`);
      
      const grossMatch = Math.abs(parseFloat(row.gross_amount || 0) - expectedGross) < 0.01;
      const netMatch = Math.abs(parseFloat(row.net_amount || 0) - expectedNet) < 0.01;
      
      if (grossMatch && netMatch) {
        console.log(`     ✅ Calculations match!`);
      } else {
        console.log(`     ❌ Calculations don't match!`);
      }
    });
    
    // 4. Kontrollo API endpoint-et
    console.log('\n4️⃣ Testoj API endpoint-in...');
    
    // Simuloj një API call
    const testQuery = `
      SELECT wh.*, 
             e.hourly_rate,
             COALESCE(e.label_type, e.labelType, 'UTR') as employee_label_type,
             COALESCE(wh.gross_amount, wh.hours * COALESCE(wh.rate, e.hourly_rate, 15)) as gross_amount,
             COALESCE(wh.net_amount, 
               CASE 
                 WHEN COALESCE(e.label_type, e.labelType, 'UTR') = 'NI' 
                 THEN (wh.hours * COALESCE(wh.rate, e.hourly_rate, 15)) * 0.70
                 ELSE (wh.hours * COALESCE(wh.rate, e.hourly_rate, 15)) * 0.80
               END
             ) as net_amount,
             COALESCE(wh.employee_type, COALESCE(e.label_type, e.labelType, 'UTR')) as employee_type
      FROM work_hours wh
      LEFT JOIN employees e ON wh.employee_id = e.id
      WHERE wh.hours > 0
      ORDER BY wh.date DESC
      LIMIT 3
    `;
    
    const apiResult = await pool.query(testQuery);
    console.log(`📡 API query returned ${apiResult.rows.length} entries with amounts`);
    
    if (apiResult.rows.length > 0) {
      const firstEntry = apiResult.rows[0];
      console.log(`   Sample API result:`);
      console.log(`     Employee ID: ${firstEntry.employee_id}`);
      console.log(`     Hours: ${firstEntry.hours}`);
      console.log(`     Gross: £${parseFloat(firstEntry.gross_amount || 0).toFixed(2)}`);
      console.log(`     Net: £${parseFloat(firstEntry.net_amount || 0).toFixed(2)}`);
      console.log(`     Type: ${firstEntry.employee_type}`);
    }
    
    console.log('\n🎉 Të gjitha testet u përfunduan!');
    
    // 5. Rekomandime
    console.log('\n📋 Rekomandime:');
    if (parseInt(data.entries_with_gross) < parseInt(data.total_entries)) {
      console.log('   ⚠️  Ka work hours pa gross amounts - ekzekuto migracionin SQL');
    }
    if (parseInt(data.entries_with_net) < parseInt(data.total_entries)) {
      console.log('   ⚠️  Ka work hours pa net amounts - ekzekuto migracionin SQL');  
    }
    if (parseInt(data.entries_with_gross) === parseInt(data.total_entries) && 
        parseInt(data.entries_with_net) === parseInt(data.total_entries)) {
      console.log('   ✅ Të gjitha work hours kanë amounts të kalkuluara!');
      console.log('   ✅ Backend-i është gati për të kthyer amounts të sakta!');
      console.log('   ✅ Frontend-i mund të përdorë amounts nga database!');
    }
    
  } catch (error) {
    console.error('❌ Gabim gjatë testimit:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ekzekuto testet
if (require.main === module) {
  testWorkHoursAmounts();
}

module.exports = testWorkHoursAmounts;

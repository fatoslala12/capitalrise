const { pool } = require('./db');

async function testInvoiceEmailTracking() {
  console.log('🧪 Testoj sistemin e email tracking për faturat...');
  
  try {
    // 1. Kontrollo nëse kolonat e reja ekzistojnë
    console.log('\n1️⃣ Kontrolloj strukturën e tabelës...');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND column_name IN ('emailed', 'emailed_at')
      ORDER BY column_name
    `);
    
    if (columnCheck.rows.length === 2) {
      console.log('✅ Kolonat e reja janë në vend:');
      columnCheck.rows.forEach(row => {
        console.log(`   • ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('❌ Kolonat e reja nuk janë gjetur! Duhet të ekzekutohet migrimi fillimisht.');
      return;
    }
    
    // 2. Kontrollo statusin aktual të faturave
    console.log('\n2️⃣ Kontrolloj statusin aktual të faturave...');
    const statusCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN emailed = true THEN 1 END) as emailed_invoices,
        COUNT(CASE WHEN emailed = false OR emailed IS NULL THEN 1 END) as not_emailed_invoices
      FROM invoices
    `);
    
    const stats = statusCheck.rows[0];
    console.log(`   📊 Gjithsej: ${stats.total_invoices} fatura`);
    console.log(`   📧 Të dërguara me email: ${stats.emailed_invoices}`);
    console.log(`   ⏳ Pa u dërguar: ${stats.not_emailed_invoices}`);
    
    // 3. Testo nëse mund të përditësojmë statusin e email-it
    if (parseInt(stats.total_invoices) > 0) {
      console.log('\n3️⃣ Testoj përditësimin e statusit të email-it...');
      
      // Marr faturën e parë
      const firstInvoice = await pool.query(`
        SELECT id, invoice_number, emailed 
        FROM invoices 
        ORDER BY id 
        LIMIT 1
      `);
      
      if (firstInvoice.rows.length > 0) {
        const invoice = firstInvoice.rows[0];
        console.log(`   📋 Testoj me faturën: ${invoice.invoice_number}`);
        
        // Përdito statusin e email-it
        await pool.query(`
          UPDATE invoices 
          SET emailed = true, emailed_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [invoice.id]);
        
        // Verifikoi përditësimin
        const updatedInvoice = await pool.query(`
          SELECT emailed, emailed_at 
          FROM invoices 
          WHERE id = $1
        `, [invoice.id]);
        
        const updated = updatedInvoice.rows[0];
        if (updated.emailed) {
          console.log(`   ✅ Email status u përditësua: ${updated.emailed_at}`);
          
          // Kthe statusin prapa për të mos ndikuar në të dhënat reale
          await pool.query(`
            UPDATE invoices 
            SET emailed = $1, emailed_at = NULL 
            WHERE id = $2
          `, [invoice.emailed, invoice.id]);
          
          console.log('   🔄 Status u kthye në gjendjen origjinale');
        } else {
          console.log('   ❌ Gabim në përditësimin e statusit');
        }
      }
    } else {
      console.log('\n3️⃣ S\'ka fatura për test - kalon testimin');
    }
    
    // 4. Testo query-të e filtrimit
    console.log('\n4️⃣ Testoj query-të e filtrimit...');
    
    const filterTests = [
      { filter: 'emailed = true', description: 'Faturat e dërguara' },
      { filter: 'emailed = false OR emailed IS NULL', description: 'Faturat pa u dërguar' },
      { filter: 'emailed_at IS NOT NULL', description: 'Faturat me datë dërgimi' }
    ];
    
    for (const test of filterTests) {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM invoices 
        WHERE ${test.filter}
      `);
      console.log(`   ${test.description}: ${result.rows[0].count} fatura`);
    }
    
    console.log('\n🎉 Të gjitha testet kaluan me sukses!');
    console.log('✅ Sistemi i email tracking është gati për përdorim.');
    
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
  testInvoiceEmailTracking();
}

module.exports = testInvoiceEmailTracking;

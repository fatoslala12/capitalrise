const { Pool } = require('pg');

// Konfigurimi i databazës - përdor Neon DB
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_vzOic6bTHB5o@ep-shy-truth-a2p7hce5-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function createTestNotifications() {
  try {
    console.log('🔔 Duke krijuar njoftime test...');
    console.log('📡 Duke u lidhur me databazën...');

    // Test lidhjen me databazën
    const testQuery = await pool.query('SELECT NOW()');
    console.log('✅ Lidhja me databazën u krye me sukses:', testQuery.rows[0].now);

    // Kontrollo nëse tabela notifications ekziston
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Tabela notifications nuk ekziston! Duke e krijuar...');
      
      // Krijo tabelën notifications
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabela notifications u krijua me sukses!');
    } else {
      console.log('✅ Tabela notifications ekziston!');
    }

    // Kontrollo nëse ka përdorues admin
    const adminUser = await pool.query('SELECT id FROM users WHERE email = $1', ['admir@gmail.com']);
    
    if (adminUser.rows.length === 0) {
      console.log('❌ Përdoruesi admir@gmail.com nuk u gjet!');
      console.log('📋 Përdoruesit e disponueshëm:');
      const users = await pool.query('SELECT id, email FROM users LIMIT 5');
      users.rows.forEach(user => {
        console.log(`   - ID: ${user.id}, Email: ${user.email}`);
      });
      return;
    }

    const adminId = adminUser.rows[0].id;
    console.log(`✅ Përdoruesi admin u gjet me ID: ${adminId}`);

    // Njoftime test për admin
    const testNotifications = [
      {
        user_id: adminId,
        type: 'contract_assigned',
        title: 'Kontratë e re e caktuar',
        message: 'Ju keni qenë caktuar për kontratën e re "Ndërtimi i shkollës së re" në Tiranë',
        isRead: false
      },
      {
        user_id: adminId,
        type: 'payment_received',
        title: 'Pagesë e re e marrë',
        message: 'Pagesa prej £2,500 është marrë me sukses për kontratën J50408078Sjhjh',
        isRead: false
      },
      {
        user_id: adminId,
        type: 'task_assigned',
        title: 'Detyrë e re e caktuar',
        message: 'Detyra "Përgatitja e materialeve" është caktuar për ju nga menaxheri',
        isRead: true
      },
      {
        user_id: adminId,
        type: 'work_hours_reminder',
        title: 'Kujtesë për orët e punës',
        message: 'Ju keni 3 ditë të paloguar orët e punës për këtë javë. Ju lutem plotësoni!',
        isRead: false
      },
      {
        user_id: adminId,
        type: 'invoice_reminder',
        title: 'Kujtesë për faturat',
        message: 'Ka 2 faturat e papaguara që duhen përfunduar këtë javë. Kontrolloni!',
        isRead: false
      },
      {
        user_id: adminId,
        type: 'expense_reminder',
        title: 'Kujtesë për shpenzimet',
        message: 'Shpenzimet e këtij muaji duhen raportuar deri më 25 të këtij muaji',
        isRead: false
      }
    ];

    console.log(`📝 Duke shtuar ${testNotifications.length} njoftime...`);

    for (const notification of testNotifications) {
      const query = `
        INSERT INTO notifications (user_id, type, title, message, category, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, title, is_read
      `;
      
      const result = await pool.query(query, [
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        'system',
        notification.isRead
      ]);
      
      console.log(`✅ Shtuar: ${result.rows[0].title} (ID: ${result.rows[0].id}, Lexuar: ${result.rows[0].is_read})`);
    }

    console.log('\n🎉 Njoftimet test u krijuan me sukses!');
    
    // Shfaq statistikat
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read
      FROM notifications 
      WHERE user_id = $1
    `, [adminId]);
    
    const stat = stats.rows[0];
    console.log(`\n📊 Statistikat për admin (ID: ${adminId}):`);
    console.log(`   - Total: ${stat.total} njoftime`);
    console.log(`   - Të palexuara: ${stat.unread}`);
    console.log(`   - Të lexuara: ${stat.read}`);
    
    // Shfaq njoftimet e fundit
    const recentNotifications = await pool.query(`
      SELECT id, title, type, is_read, created_at 
      FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [adminId]);
    
    console.log('\n📋 Njoftimet e fundit:');
    recentNotifications.rows.forEach((row, index) => {
      const status = row.is_read ? '✅ E lexuar' : '🔴 E palexuar';
      const date = new Date(row.created_at).toLocaleString('sq-AL');
      console.log(`   ${index + 1}. ${row.title} (${row.type}) - ${status} - ${date}`);
    });

  } catch (error) {
    console.error('❌ Gabim në krijimin e njoftimeve test:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔚 Lidhja me databazën u mbyll.');
  }
}

// Ekzekuto skriptin
createTestNotifications(); 
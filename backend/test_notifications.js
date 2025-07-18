const { Pool } = require('pg');

// Konfigurimi i databazës
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/building_system',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestNotifications() {
  try {
    console.log('Duke krijuar njoftime test...');

    // Njoftime test për admin
    const testNotifications = [
      {
        user_id: 1, // admin
        type: 'contract_assigned',
        title: 'Kontratë e re e caktuar',
        message: 'Ju keni qenë caktuar për kontratën e re "Ndërtimi i shkollës së re"',
        isRead: false
      },
      {
        user_id: 1,
        type: 'payment_received',
        title: 'Pagesë e re e marrë',
        message: 'Pagesa prej £2,500 është marrë për kontratën J50408078Sjhjh',
        isRead: false
      },
      {
        user_id: 1,
        type: 'task_assigned',
        title: 'Detyrë e re e caktuar',
        message: 'Detyra "Përgatitja e materialeve" është caktuar për ju',
        isRead: true
      },
      {
        user_id: 1,
        type: 'work_hours_reminder',
        title: 'Kujtesë për orët e punës',
        message: 'Ju keni 3 ditë të paloguar orët e punës për këtë javë',
        isRead: false
      },
      {
        user_id: 1,
        type: 'invoice_reminder',
        title: 'Kujtesë për faturat',
        message: 'Ka 2 faturat e papaguara që duhen përfunduar këtë javë',
        isRead: false
      }
    ];

    for (const notification of testNotifications) {
      const query = `
        INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      await pool.query(query, [
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.isRead
      ]);
    }

    console.log('Njoftimet test u krijuan me sukses!');
    
    // Shfaq njoftimet e krijuara
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5');
    console.log('Njoftimet e fundit:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title} - ${row.is_read ? 'E lexuar' : 'E palexuar'}`);
    });

  } catch (error) {
    console.error('Gabim në krijimin e njoftimeve test:', error);
  } finally {
    await pool.end();
  }
}

createTestNotifications(); 
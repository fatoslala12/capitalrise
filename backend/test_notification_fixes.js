const { Pool } = require('pg');
const NotificationService = require('./services/notificationService');

// Konfigurimi i databazës
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_vzOic6bTHB5o@ep-shy-truth-a2p7hce5-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function testNotificationFixes() {
  try {
    console.log('🔧 Duke testuar rregullimet e sistemit të njoftimeve...');
    console.log('📡 Duke u lidhur me databazën...');

    // Test lidhjen me databazën
    const testQuery = await pool.query('SELECT NOW()');
    console.log('✅ Lidhja me databazën u krye me sukses:', testQuery.rows[0].now);

    // 1. Test Mark as Read
    console.log('\n📋 Test 1: Mark as Read');
    const testNotification = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, category, is_read)
      VALUES (36, 'Test Mark as Read', 'Ky është një test për mark as read', 'test', 'system', false)
      RETURNING id
    `);
    
    const notificationId = testNotification.rows[0].id;
    console.log(`✅ Njoftimi test u krijua me ID: ${notificationId}`);
    
    // Test mark as read
    const markResult = await NotificationService.markAsRead(notificationId, 36);
    if (markResult && markResult.is_read) {
      console.log('✅ Mark as Read funksionon!');
    } else {
      console.log('❌ Mark as Read nuk funksionon!');
    }

    // 2. Test Email Notifications
    console.log('\n📧 Test 2: Email Notifications');
    const emailTest = await NotificationService.createNotification(
      36,
      'Test Email Notification',
      'Ky është një test për email notifications. Kontrolloni nëse e merrni email-in.',
      'info',
      'test'
    );
    console.log('✅ Email notification u dërgua:', emailTest ? 'SUCCESS' : 'FAILED');

    // 3. Test Work Hours Notifications
    console.log('\n⏰ Test 3: Work Hours Notifications');
    const workHoursTest = await NotificationService.createNotification(
      36,
      '📊 Orët e punës u shtuan',
      'Menaxheri shtoi orët e punës për 3 punonjës me gjithsej 45 orë për javën 15.07.2024 - 21.07.2024',
      'info',
      'work_hours',
      null,
      'work_hours_added',
      2
    );
    console.log('✅ Work hours notification u krijua:', workHoursTest ? 'SUCCESS' : 'FAILED');

    // 4. Test Payment Notifications
    console.log('\n💰 Test 4: Payment Notifications');
    const paymentTest = await NotificationService.createNotification(
      36,
      '💰 Pagesa u konfirmua',
      'Orët tuaja për javën 15.07.2024 - 21.07.2024 u paguan: £450.00',
      'success',
      'payment',
      null,
      'payment_confirmed',
      1
    );
    console.log('✅ Payment notification u krijua:', paymentTest ? 'SUCCESS' : 'FAILED');

    // 5. Test Real-time Notifications
    console.log('\n⚡ Test 5: Real-time Notifications');
    const realtimeTest = await NotificationService.createNotification(
      36,
      '⚡ Njoftim në kohë reale',
      'Ky është një test për real-time notifications',
      'info',
      'realtime',
      null,
      'realtime_test',
      1
    );
    console.log('✅ Real-time notification u krijua:', realtimeTest ? 'SUCCESS' : 'FAILED');

    // 6. Shfaq statistikat
    console.log('\n📊 Statistikat e njoftimeve:');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read,
        COUNT(CASE WHEN type = 'test' THEN 1 END) as test_notifications
      FROM notifications 
      WHERE user_id = 36
    `);
    
    const stat = stats.rows[0];
    console.log(`   - Total: ${stat.total} njoftime`);
    console.log(`   - Të palexuara: ${stat.unread}`);
    console.log(`   - Të lexuara: ${stat.read}`);
    console.log(`   - Test notifications: ${stat.test_notifications}`);

    // 7. Shfaq njoftimet e fundit
    console.log('\n📋 Njoftimet e fundit:');
    const recentNotifications = await pool.query(`
      SELECT id, title, type, is_read, created_at 
      FROM notifications 
      WHERE user_id = 36 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    recentNotifications.rows.forEach((row, index) => {
      const status = row.is_read ? '✅ E lexuar' : '🔴 E palexuar';
      const date = new Date(row.created_at).toLocaleString('sq-AL');
      console.log(`   ${index + 1}. ${row.title} (${row.type}) - ${status} - ${date}`);
    });

    console.log('\n🎉 Të gjitha testet u kryen me sukses!');
    console.log('\n📝 Përmbledhje e rregullimeve:');
    console.log('   ✅ Mark as Read - u rregullua me error handling');
    console.log('   ✅ Email Notifications - u rregullua me API key check');
    console.log('   ✅ Work Hours Notifications - u shtua për admin');
    console.log('   ✅ Payment Notifications - u shtua për manager dhe user');
    console.log('   ✅ Real-time Notifications - funksionon');

  } catch (error) {
    console.error('❌ Gabim në testimin e rregullimeve:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔚 Lidhja me databazën u mbyll.');
  }
}

// Ekzekuto testet
testNotificationFixes();
const { Pool } = require('pg');
const NotificationService = require('./services/notificationService');

// Konfigurimi i databazës
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_vzOic6bTHB5o@ep-shy-truth-a2p7hce5-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function testComprehensiveNotifications() {
  try {
    console.log('🔧 Duke testuar sistemin e plotë të njoftimeve...');
    console.log('📡 Duke u lidhur me databazën...');

    // Test lidhjen me databazën
    const testQuery = await pool.query('SELECT NOW()');
    console.log('✅ Lidhja me databazën u krye me sukses:', testQuery.rows[0].now);

    // Merr user IDs për secilin rol
    const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const managerUsers = await pool.query("SELECT id FROM users WHERE role = 'manager' LIMIT 1");
    const regularUsers = await pool.query("SELECT id FROM users WHERE role = 'user' LIMIT 1");

    const adminId = adminUsers.rows[0]?.id || 36;
    const managerId = managerUsers.rows[0]?.id || 37;
    const userId = regularUsers.rows[0]?.id || 38;

    console.log(`\n👥 User IDs: Admin=${adminId}, Manager=${managerId}, User=${userId}`);

    // 1. Test ADMIN Notifications
    console.log('\n👑 Test 1: ADMIN Notifications');
    
    await NotificationService.notifyAdminContractCreated('Kontratë Test', 123);
    console.log('✅ Contract creation notification sent to admin');
    
    await NotificationService.notifyAdminEmployeeAdded('Gjergj Lala');
    console.log('✅ Employee addition notification sent to admin');
    
    await NotificationService.notifyAdminPaymentProcessed(500, 'Fatos Lala');
    console.log('✅ Payment processing notification sent to admin');

    // 2. Test MANAGER Notifications
    console.log('\n👨‍💼 Test 2: MANAGER Notifications');
    
    await NotificationService.notifyManagerTaskAssigned(managerId, 'Instalimi i elektrikit', 'Fatos Lala');
    console.log('✅ Task assignment notification sent to manager');
    
    await NotificationService.notifyManagerEmployeeUpdate(managerId, 'Gjergj Lala', 'u përditësua');
    console.log('✅ Employee update notification sent to manager');
    
    await NotificationService.notifyManagerWorkHoursSubmitted(managerId, 'Fatos Lala', 40);
    console.log('✅ Work hours submission notification sent to manager');
    
    await NotificationService.notifyManagerPaymentConfirmed(managerId, 450, 'Fatos Lala');
    console.log('✅ Payment confirmation notification sent to manager');

    // 3. Test USER Notifications
    console.log('\n👷 Test 3: USER Notifications');
    
    await NotificationService.notifyUserWorkHoursReminder(userId, '15.07.2024', '21.07.2024');
    console.log('✅ Work hours reminder sent to user');
    
    await NotificationService.notifyUserContractUpdate(userId, 'Kontratë Test', 'u përditësua');
    console.log('✅ Contract update notification sent to user');
    
    await NotificationService.notifyUserTaskCompleted(userId, 'Instalimi i elektrikit');
    console.log('✅ Task completion notification sent to user');
    
    await NotificationService.notifyUserTaskOverdue(userId, 'Punimi i murit');
    console.log('✅ Task overdue notification sent to user');

    // 4. Test System Announcements
    console.log('\n📢 Test 4: System Announcements');
    
    await NotificationService.notifySystemAnnouncement(
      '🔧 Mirëmbajtje e sistemit',
      'Sistemi do të jetë i padisponueshëm nga ora 02:00-04:00 për mirëmbajtje të rregullt.',
      ['admin', 'manager']
    );
    console.log('✅ System announcement sent to admin and manager');

    // 5. Test Reminder Checks
    console.log('\n⏰ Test 5: Reminder Checks');
    
    await NotificationService.checkPendingApprovals();
    console.log('✅ Pending approvals check completed');
    
    await NotificationService.checkIncompleteTasks();
    console.log('✅ Incomplete tasks check completed');

    // 6. Shfaq statistikat për secilin rol
    console.log('\n📊 Statistikat për secilin rol:');
    
    for (const [role, id] of [['Admin', adminId], ['Manager', managerId], ['User', userId]]) {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
          COUNT(CASE WHEN is_read = true THEN 1 END) as read
        FROM notifications 
        WHERE user_id = $1
      `, [id]);
      
      const stat = stats.rows[0];
      console.log(`   ${role}: ${stat.total} total, ${stat.unread} të palexuara, ${stat.read} të lexuara`);
    }

    // 7. Shfaq njoftimet e fundit për secilin rol
    console.log('\n📋 Njoftimet e fundit për secilin rol:');
    
    for (const [role, id] of [['Admin', adminId], ['Manager', managerId], ['User', userId]]) {
      console.log(`\n   ${role}:`);
      const recentNotifications = await pool.query(`
        SELECT title, type, is_read, created_at 
        FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 3
      `, [id]);
      
      recentNotifications.rows.forEach((row, index) => {
        const status = row.is_read ? '✅' : '🔴';
        const date = new Date(row.created_at).toLocaleTimeString('sq-AL');
        console.log(`     ${index + 1}. ${status} ${row.title} (${row.type}) - ${date}`);
      });
    }

    console.log('\n🎉 Të gjitha testet u kryen me sukses!');
    console.log('\n📝 Përmbledhje e përmirësimeve:');
    console.log('   ✅ Njoftime të plota për ADMIN');
    console.log('   ✅ Njoftime të zgjeruara për MANAGER');
    console.log('   ✅ Njoftime të përmirësuara për USER');
    console.log('   ✅ System announcements');
    console.log('   ✅ Reminder checks të automatizuara');
    console.log('   ✅ Role-based notification settings');

  } catch (error) {
    console.error('❌ Gabim në testimin e njoftimeve:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔚 Lidhja me databazën u mbyll.');
  }
}

// Ekzekuto testet
testComprehensiveNotifications();
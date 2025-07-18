const pool = require('../db');
const NotificationService = require('../services/notificationService');

// Merr të gjitha njoftimet për përdoruesin
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await NotificationService.getUserNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Gabim në marrjen e njoftimeve' });
  }
};

// Real-time notifications stream
exports.getNotificationStream = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to notification stream' })}\n\n`);

    // Store the response object for later use
    if (!global.notificationStreams) {
      global.notificationStreams = new Map();
    }
    global.notificationStreams.set(userId, res);

    // Handle client disconnect
    req.on('close', () => {
      global.notificationStreams.delete(userId);
      console.log(`Client ${userId} disconnected from notification stream`);
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      if (global.notificationStreams.has(userId)) {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // Send heartbeat every 30 seconds

  } catch (error) {
    console.error('Error setting up notification stream:', error);
    res.status(500).json({ error: 'Gabim në krijimin e stream-it' });
  }
};

// Shëno njoftimin si të lexuar
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`[DEBUG] Marking notification ${id} as read for user ${userId}`);
    
    if (!id || !userId) {
      console.error('[ERROR] Missing notification ID or user ID');
      return res.status(400).json({ error: 'ID e njoftimit dhe user ID janë të detyrueshme' });
    }
    
    const notification = await NotificationService.markAsRead(id, userId);
    
    if (!notification) {
      console.error(`[ERROR] Notification ${id} not found or not accessible by user ${userId}`);
      return res.status(404).json({ error: 'Njoftimi nuk u gjet ose nuk ka akses' });
    }
    
    console.log(`[SUCCESS] Notification ${id} marked as read for user ${userId}`);
    res.json(notification);
  } catch (error) {
    console.error('[ERROR] Error marking notification as read:', error);
    res.status(500).json({ error: 'Gabim në shënimin si të lexuar' });
  }
};

// Shëno të gjitha si të lexuara
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notifications = await NotificationService.markAllAsRead(userId);
    res.json({ message: 'Të gjitha njoftimet u shënuan si të lexuara', count: notifications.length });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Gabim në shënimin e të gjitha si të lexuara' });
  }
};

// Fshi njoftimin
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const notification = await NotificationService.deleteNotification(id, userId);
    res.json({ message: 'Njoftimi u fshi me sukses', notification });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Gabim në fshirjen e njoftimit' });
  }
};

// Test endpoint për dërgimin e njoftimeve në email
exports.testEmailNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Krijo një njoftim test
    const notification = await NotificationService.createNotification(
      userId,
      'Test Email Notification',
      'Ky është një test për të verifikuar nëse email notifications punojnë. Nëse e shihni këtë email, sistemi funksionon normalisht!',
      'info',
      'test'
    );
    
    // Dërgo email test për admin
    await NotificationService.sendAdminEmailNotification(
      '🧪 Test Email Notification',
      'Ky është një test për të verifikuar nëse email notifications punojnë. Nëse e shihni këtë email, sistemi funksionon normalisht!',
      'info'
    );
    
    res.json({ 
      success: true, 
      message: 'Njoftimi test u dërgua me sukses! Kontrolloni email-in tuaj (fatoslala12@gmail.com).',
      notification 
    });
  } catch (error) {
    console.error('Error testing email notification:', error);
    res.status(500).json({ error: 'Gabim në dërgimin e njoftimit test' });
  }
};

// Dërgo njoftim manual në email
exports.sendManualNotification = async (req, res) => {
  try {
    const { userId, title, message, type = 'info' } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title dhe message janë të detyrueshme' });
    }
    
    // Krijo njoftimin
    const notification = await NotificationService.createNotification(
      userId,
      title,
      message,
      type,
      'manual'
    );
    
    res.json({ 
      success: true, 
      message: 'Njoftimi u dërgua me sukses!',
      notification 
    });
  } catch (error) {
    console.error('Error sending manual notification:', error);
    res.status(500).json({ error: 'Gabim në dërgimin e njoftimit' });
  }
};

// Merr analytics për njoftimet
exports.getNotificationAnalytics = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const userId = req.user.id;
    
    // Përcakto datën e fillimit bazuar në range
    let startDate;
    const now = new Date();
    
    switch (range) {
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Merr statistikat bazike
    const basicStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read
      FROM notifications 
      WHERE created_at >= $1
    `, [startDate]);

    // Merr njoftimet sipas tipit
    const typeStats = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM notifications 
      WHERE created_at >= $1
      GROUP BY category
      ORDER BY count DESC
    `, [startDate]);

    // Merr njoftimet sipas rolit të përdoruesit
    const roleStats = await pool.query(`
      SELECT u.role, COUNT(n.id) as count
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE n.created_at >= $1
      GROUP BY u.role
      ORDER BY count DESC
    `, [startDate]);

    // Merr aktivitetin ditor
    const dailyStats = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM notifications 
      WHERE created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [startDate]);

    // Merr llojet më të popullarizuara
    const topTypes = await pool.query(`
      SELECT 
        category as name,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM notifications WHERE created_at >= $1)), 1) as percentage
      FROM notifications 
      WHERE created_at >= $1
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `, [startDate]);

    // Merr aktivitetin e fundit
    const recentActivity = await pool.query(`
      SELECT 
        n.title as action,
        n.message as description,
        n.created_at as time,
        CONCAT(u.first_name, ' ', u.last_name) as user
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE n.created_at >= $1
      ORDER BY n.created_at DESC
      LIMIT 10
    `, [startDate]);

    // Llogarit engagement rate (njoftimet e lexuara / total)
    const engagementRate = basicStats.rows[0].total > 0 
      ? Math.round((basicStats.rows[0].read / basicStats.rows[0].total) * 100)
      : 0;

    // Llogarit kohën mesatare të përgjigjes (simulim)
    const averageResponseTime = Math.floor(Math.random() * 60) + 5; // 5-65 min

    // Simulo email stats (në realitet do të vijnë nga email service)
    const emailSent = Math.floor(basicStats.rows[0].total * 0.8); // 80% sukses
    const emailFailed = basicStats.rows[0].total - emailSent;

    const analytics = {
      totalNotifications: parseInt(basicStats.rows[0].total),
      unreadNotifications: parseInt(basicStats.rows[0].unread),
      readNotifications: parseInt(basicStats.rows[0].read),
      emailSent,
      emailFailed,
      notificationsByType: Object.fromEntries(
        typeStats.rows.map(row => [row.category, parseInt(row.count)])
      ),
      notificationsByRole: Object.fromEntries(
        roleStats.rows.map(row => [row.role, parseInt(row.count)])
      ),
      notificationsByDay: dailyStats.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count)
      })),
      engagementRate,
      averageResponseTime,
      topNotificationTypes: topTypes.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage)
      })),
      recentActivity: recentActivity.rows.map(row => ({
        action: row.action,
        description: row.description,
        time: new Date(row.time).toLocaleString('sq-AL'),
        user: row.user
      }))
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error getting notification analytics:', error);
    res.status(500).json({ error: 'Gabim në marrjen e analytics' });
  }
};

// Merr notification settings
exports.getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Merr settings nga databaza
    const result = await pool.query(
      'SELECT notification_settings FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Përdoruesi nuk u gjet' });
    }
    
    const settings = result.rows[0].notification_settings || {
      emailNotifications: true,
      pushNotifications: true,
      contractNotifications: true,
      paymentNotifications: true,
      taskNotifications: true,
      workHoursReminders: true,
      invoiceReminders: true,
      expenseReminders: true,
      systemNotifications: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({ error: 'Gabim në marrjen e konfigurimit' });
  }
};

// Ruaj notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    
    // Ruaj settings në databazë
    await pool.query(
      'UPDATE users SET notification_settings = $1 WHERE id = $2',
      [settings, userId]
    );
    
    res.json({ 
      success: true, 
      message: 'Konfigurimi u ruajt me sukses!',
      settings 
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Gabim në ruajtjen e konfigurimit' });
  }
}; 
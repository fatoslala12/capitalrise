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
    
    const notification = await NotificationService.markAsRead(id, userId);
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
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
    
    res.json({ 
      success: true, 
      message: 'Njoftimi test u dërgua me sukses! Kontrolloni email-in tuaj.',
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
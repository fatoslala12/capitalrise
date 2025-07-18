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
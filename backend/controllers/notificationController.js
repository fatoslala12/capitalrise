const NotificationService = require('../services/notificationService');

// Merr njoftimet për përdoruesin
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const notifications = await NotificationService.getUserNotifications(userId, parseInt(limit), parseInt(offset));
    
    res.json(notifications);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së njoftimeve' });
  }
};

// Merr numrin e njoftimeve të palexuara
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await NotificationService.getUnreadCount(userId);
    
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së numrit të njoftimeve' });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    const notification = await NotificationService.markAsRead(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Njoftimi nuk u gjet' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Gabim gjatë shënimit të njoftimit' });
  }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await NotificationService.markAllAsRead(userId);
    
    res.json({ message: 'Të gjitha njoftimet u shënuan si të lexuara', count: notifications.length });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Gabim gjatë shënimit të njoftimeve' });
  }
};

// Fshi një njoftim
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    const notification = await NotificationService.deleteNotification(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Njoftimi nuk u gjet' });
    }
    
    res.json({ message: 'Njoftimi u fshi me sukses' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Gabim gjatë fshirjes së njoftimit' });
  }
};

// Merr të gjitha njoftimet (për faqen "Shiko të gjitha")
exports.getAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const notifications = await NotificationService.getUserNotifications(userId, parseInt(limit), offset);
    const totalCount = await NotificationService.getUnreadCount(userId);
    
    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error getting all notifications:', error);
    res.status(500).json({ error: 'Gabim gjatë marrjes së njoftimeve' });
  }
};

// Ekzekuto kontrollin e reminder-ëve (për admin)
exports.runReminderChecks = async (req, res) => {
  try {
    // Kontrollo nëse përdoruesi është admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Vetëm admin mund të ekzekutojë këtë veprim' });
    }
    
    await NotificationService.runReminderChecks();
    
    res.json({ message: 'Kontrolli i reminder-ëve u ekzekutua me sukses' });
  } catch (error) {
    console.error('Error running reminder checks:', error);
    res.status(500).json({ error: 'Gabim gjatë ekzekutimit të kontrollit' });
  }
}; 
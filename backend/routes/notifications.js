const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

// Merr njoftimet për përdoruesin
router.get('/', verifyToken, notificationController.getUserNotifications);

// Merr numrin e njoftimeve të palexuara
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);

// Merr të gjitha njoftimet (për faqen "Shiko të gjitha")
router.get('/all', verifyToken, notificationController.getAllNotifications);

// Mark as read
router.put('/:notificationId/read', verifyToken, notificationController.markAsRead);

// Mark all as read
router.put('/mark-all-read', verifyToken, notificationController.markAllAsRead);

// Fshi një njoftim
router.delete('/:notificationId', verifyToken, notificationController.deleteNotification);

// Ekzekuto kontrollin e reminder-ëve (për admin)
router.post('/run-reminders', verifyToken, notificationController.runReminderChecks);

module.exports = router; 
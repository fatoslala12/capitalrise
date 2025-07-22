const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Merr të gjitha njoftimet
router.get('/', verifyToken, notificationController.getNotifications);

// Shëno njoftimin si të lexuar
router.patch('/:id/read', verifyToken, notificationController.markAsRead);

// Shëno të gjitha si të lexuara
router.patch('/mark-all-read', verifyToken, notificationController.markAllAsRead);

// Fshi njoftimin
router.delete('/:id', verifyToken, notificationController.deleteNotification);

// Test endpoint për email notifications
router.post('/test-email', verifyToken, notificationController.testEmailNotification);

// Dërgo njoftim manual
router.post('/send-manual', verifyToken, notificationController.sendManualNotification);

// Dërgo njoftim manual te menaxherët (vetëm admin)
router.post('/send-to-manager', verifyToken, requireRole('admin'), notificationController.sendToManager);

// Notification settings
router.get('/settings', verifyToken, notificationController.getNotificationSettings);
router.put('/settings', verifyToken, notificationController.updateNotificationSettings);

// Analytics routes
router.get('/analytics', verifyToken, notificationController.getNotificationAnalytics);

module.exports = router; 
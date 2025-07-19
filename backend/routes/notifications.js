const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Merr të gjitha njoftimet
router.get('/', verifyToken, notificationController.getNotifications);

// Real-time notifications stream
router.get('/stream', verifyToken, (req, res, next) => {
  console.log('[DEBUG] /api/notifications/stream route hit');
  console.log('[DEBUG] User ID:', req.user.id);
  console.log('[DEBUG] Headers:', req.headers);
  next();
}, notificationController.getNotificationStream);

// Shëno njoftimin si të lexuar
router.patch('/:id/read', verifyToken, notificationController.markAsRead);

// Shëno të gjitha si të lexuara
router.patch('/mark-all-read', verifyToken, notificationController.markAllAsRead);

// Fshi njoftimin
router.delete('/:id', verifyToken, notificationController.deleteNotification);

// Test endpoint për email notifications
router.post('/test-email', verifyToken, notificationController.testEmailNotification);

// Test EventSource endpoint
router.get('/test-stream', (req, res) => {
  console.log('[DEBUG] Test stream endpoint hit');
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'https://building-system-seven.vercel.app',
    'Access-Control-Allow-Credentials': 'true'
  });
  
  res.write(`data: ${JSON.stringify({ type: 'test', message: 'Test stream working' })}\n\n`);
  
  setTimeout(() => {
    res.write(`data: ${JSON.stringify({ type: 'test', message: 'Test stream closing' })}\n\n`);
    res.end();
  }, 5000);
});

// Dërgo njoftim manual
router.post('/send-manual', verifyToken, notificationController.sendManualNotification);

// Notification settings
router.get('/settings', verifyToken, notificationController.getNotificationSettings);
router.put('/settings', verifyToken, notificationController.updateNotificationSettings);

// Analytics routes
router.get('/analytics', verifyToken, notificationController.getNotificationAnalytics);

module.exports = router; 
const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { verifyToken, requireRole } = require('../middleware/auth');

// System management routes (admin only)
router.post('/restart', verifyToken, requireRole('admin'), systemController.restartSystem);
router.get('/logs', verifyToken, requireRole('admin'), systemController.getSystemLogs);
router.post('/maintenance', verifyToken, requireRole('admin'), systemController.toggleMaintenance);
router.get('/status', verifyToken, requireRole('admin'), systemController.getSystemStatus);

module.exports = router;

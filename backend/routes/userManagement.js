const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagementController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Krijo user i ri (admin dhe manager me kufizime në controller)
router.post('/create', verifyToken, requireRole(['admin', 'manager']), userManagementController.createUser);

// Përditëso user (admin dhe manager)
router.put('/:id', verifyToken, requireRole(['admin', 'manager']), userManagementController.updateUser);

// Fshi user (vetëm admin)
router.delete('/:id', verifyToken, requireRole('admin'), userManagementController.deleteUser);

// Merr të gjithë users (admin dhe manager)
router.get('/', verifyToken, requireRole(['admin', 'manager']), userManagementController.getAllUsers);

// Merr user nga ID (admin dhe manager)
router.get('/:id', verifyToken, requireRole(['admin', 'manager']), userManagementController.getUserById);

// Reset password (publik - për forgot password)
router.post('/reset-password', userManagementController.resetPassword);

// Test email service (vetëm admin)
router.post('/test-email', verifyToken, requireRole('admin'), userManagementController.testEmailService);

// Merr email service status (admin dhe manager)
router.get('/email/status', verifyToken, requireRole(['admin', 'manager']), userManagementController.getEmailServiceStatus);

module.exports = router; 
const express = require('express');
const router = express.Router();
const controller = require('../controllers/workHoursController');
const { verifyToken: origVerifyToken, requireRole } = require('../middleware/auth');



// Wrap verifyToken to add debug log
function verifyToken(req, res, next) {

  return origVerifyToken(req, res, next);
}

// Debug routes - duhet të jenë para route-ve me parametra
router.get('/debug-manager', verifyToken, controller.debugManagerAccess);
router.get('/debug-database', verifyToken, controller.debugDatabaseStatus);
router.get('/check-manager-access', verifyToken, controller.checkManagerAccess);

// Core structured routes - must be before parameterized routes
router.get('/structured', verifyToken, controller.getStructuredWorkHours);
router.get('/structured/:employeeId', verifyToken, controller.getStructuredWorkHoursForEmployee);

// Payment and status routes
router.get('/paid-status', verifyToken, controller.getPaidStatus);
router.post('/paid-status', verifyToken, requireRole('admin'), controller.setPaidStatus);
router.post('/update-payment-status', verifyToken, requireRole('admin'), controller.updatePaymentStatus);

// Work hours management routes
router.post('/bulk-update', verifyToken, requireRole('manager'), controller.bulkUpdateWorkHours);
router.post('/fix-amounts', verifyToken, requireRole('admin'), controller.fixWorkHoursAmounts);

// Dashboard and notes routes
router.get('/dashboard-stats', verifyToken, controller.getDashboardStats);
router.post('/notes', verifyToken, controller.saveWeekNote);
router.get('/notes/:employeeId', verifyToken, controller.getWeekNotes);

// Contract routes
router.get('/contract/:contract_number', verifyToken, controller.getWorkHoursByContract);

// Basic CRUD routes
router.get('/', verifyToken, controller.getAllWorkHours);
router.post('/', verifyToken, controller.addWorkHours);
router.put('/:id', verifyToken, requireRole('admin'), controller.updateWorkHours);
router.delete('/:id', verifyToken, requireRole('admin'), controller.deleteWorkHours);

// Employee-specific routes - must be last to avoid conflicts
router.get('/:employeeId', verifyToken, controller.getWorkHoursByEmployee);

module.exports = router;

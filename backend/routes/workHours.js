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

// /structured route must be before any parameterized routes!
router.get('/structured', verifyToken, controller.getStructuredWorkHours);

router.get('/paid-status', verifyToken, controller.getPaidStatus);
router.post('/paid-status', verifyToken, requireRole('admin'), controller.setPaidStatus);
router.post('/update-payment-status', verifyToken, requireRole('admin'), controller.updatePaymentStatus);
router.post('/bulk-update', verifyToken, requireRole('manager'), controller.bulkUpdateWorkHours);
router.post('/fix-amounts', verifyToken, requireRole('admin'), controller.fixWorkHoursAmounts);
router.get('/dashboard-stats', verifyToken, controller.getDashboardStats);
router.post('/notes', verifyToken, controller.saveWeekNote);
router.get('/notes/:employeeId', verifyToken, controller.getWeekNotes);

router.get('/', verifyToken, controller.getAllWorkHours);
router.post('/', verifyToken, controller.addWorkHours);
router.put('/:id', verifyToken, requireRole('admin'), controller.updateWorkHours);
router.delete('/:id', verifyToken, requireRole('admin'), controller.deleteWorkHours);
router.get('/contract/:contract_number', controller.getWorkHoursByContract);
router.get('/structured/:employeeId', controller.getStructuredWorkHoursForEmployee);

// Route me parametra duhet të jetë në fund
router.get('/:employeeId', verifyToken, controller.getWorkHoursByEmployee);

module.exports = router;

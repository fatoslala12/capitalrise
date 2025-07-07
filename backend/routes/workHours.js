const express = require('express');
const router = express.Router();
const controller = require('../controllers/workHoursController');
const { verifyToken: origVerifyToken, requireRole } = require('../middleware/auth');

console.log('[DEBUG] workHours routes loaded');

// Wrap verifyToken to add debug log
function verifyToken(req, res, next) {
  console.log('[DEBUG] verifyToken called for', req.originalUrl);
  return origVerifyToken(req, res, next);
}

// /structured route must be before any parameterized routes!
router.get('/structured', verifyToken, (req, res, next) => {
  console.log('[DEBUG] /api/work-hours/structured route hit - PARA next()');
  next();
  console.log('[DEBUG] /api/work-hours/structured route hit - PAS next()');
}, controller.getStructuredWorkHours);

router.get('/paid-status', verifyToken, controller.getPaidStatus);
router.post('/paid-status', verifyToken, requireRole('admin'), controller.setPaidStatus);

router.get('/', verifyToken, controller.getAllWorkHours);
router.get('/:employeeId', verifyToken, controller.getWorkHoursByEmployee);
router.post('/', verifyToken, controller.addWorkHours);
router.put('/:id', verifyToken, requireRole('admin'), controller.updateWorkHours);
router.delete('/:id', verifyToken, requireRole('admin'), controller.deleteWorkHours);
router.get('/contract/:contract_number', controller.getWorkHoursByContract);
router.get('/structured/:employeeId', controller.getStructuredWorkHoursForEmployee);

module.exports = router;

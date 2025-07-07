const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentsController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, controller.getAllPayments);
router.get('/:employeeId', verifyToken, controller.getPaymentsByEmployee);
router.post('/', verifyToken, requireRole('admin'), controller.addPayment);
router.put('/:id', verifyToken, requireRole('admin'), controller.updatePayment);
router.delete('/:id', verifyToken, requireRole('admin'), controller.deletePayment);

module.exports = router;

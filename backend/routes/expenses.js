const express = require('express');
const router = express.Router();
const controller = require('../controllers/expensesController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, controller.getAllExpenses);
router.get('/:contract_number', verifyToken, controller.getExpensesByContract);
router.post('/', verifyToken, requireRole('admin'), controller.addExpense);
router.post('/:contract_number', verifyToken, controller.addExpenseForContract);
router.put('/:id', verifyToken, requireRole('admin'), controller.updateExpense);
router.delete('/:id', verifyToken, requireRole('admin'), controller.deleteExpense);
router.put('/:id/toggle-paid', verifyToken, requireRole('admin'), controller.togglePaidStatus);

module.exports = router;

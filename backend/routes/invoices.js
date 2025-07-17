const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, invoiceController.getAllInvoices);
router.get('/:contract_number', verifyToken, invoiceController.getInvoicesByContract);
router.post('/:contract_number', verifyToken, invoiceController.addInvoice);
router.put('/:id/toggle-paid', verifyToken, invoiceController.togglePaid);
router.delete('/:id', verifyToken, invoiceController.deleteInvoice);
router.post('/:invoiceId/send-email', verifyToken, invoiceController.sendInvoiceEmail);
router.post('/:contract_number/send-contract-details', verifyToken, invoiceController.sendContractDetailsEmail);

module.exports = router;

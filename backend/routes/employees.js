const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, employeesController.getAllEmployees);
router.get('/:id', verifyToken, employeesController.getEmployeeById);
router.post('/', verifyToken, requireRole('admin'), employeesController.createEmployee);
router.put('/:id', verifyToken, requireRole('admin'), employeesController.updateEmployee);
router.delete('/:id', verifyToken, requireRole('admin'), employeesController.deleteEmployee);
router.put('/:id/documents', verifyToken, requireRole('admin'), employeesController.uploadEmployeeDocument);
router.get('/:id/attachments', verifyToken, employeesController.getEmployeeAttachments);
router.post('/:id/attachments', verifyToken, requireRole('admin'), employeesController.addEmployeeAttachment);
router.delete('/:id/attachments/:attachmentId', verifyToken, requireRole('admin'), employeesController.deleteEmployeeAttachment);
router.get('/by-site/:site_name', verifyToken, employeesController.getEmployeesBySite);

module.exports = router;

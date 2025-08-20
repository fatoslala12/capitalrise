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
// Lejo admin ose vetë menaxherin/punonjësin të ngarkojë dokument për profilin e vet
router.post('/:id/attachments', verifyToken, (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const isSelf = String(req.user?.employee_id) === String(req.params.id);
    const isManager = req.user?.role === 'manager' && isSelf;
    if (isAdmin || isSelf || isManager) return next();
  } catch {}
  return res.status(403).json({ error: 'Akses i ndaluar' });
}, employeesController.addEmployeeAttachment);
router.delete('/:id/attachments/:attachmentId', verifyToken, requireRole('admin'), employeesController.deleteEmployeeAttachment);
router.get('/by-site/:site_name', verifyToken, employeesController.getEmployeesBySite);
router.get('/manager/:managerId', verifyToken, employeesController.getEmployeesForManager);

module.exports = router;

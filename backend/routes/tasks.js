const express = require('express');
const router = express.Router();
const controller = require('../controllers/tasksController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, controller.getAllTasks);
router.get('/:employeeId', verifyToken, controller.getTasksByEmployee);
router.get('/manager/:managerId', verifyToken, controller.getTasksForManager);
router.get('/dashboard/manager/:managerId', verifyToken, controller.getManagerDashboardStats);
// Lejo admin ose manager të shtojë detyra
router.post('/', verifyToken, (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const isManager = req.user?.role === 'manager';
    if (isAdmin || isManager) return next();
  } catch {}
  return res.status(403).json({ error: 'Akses i ndaluar' });
}, controller.addTask);
router.put('/:id', verifyToken, controller.updateTaskStatus);
router.delete('/:id', verifyToken, requireRole('admin'), controller.deleteTask);

module.exports = router;

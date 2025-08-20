const express = require('express');
const router = express.Router();
const controller = require('../controllers/tasksController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, controller.getAllTasks);
router.get('/:employeeId', verifyToken, controller.getTasksByEmployee);
router.get('/manager/:managerId', verifyToken, controller.getTasksForManager);
router.get('/dashboard/manager/:managerId', verifyToken, controller.getManagerDashboardStats);
router.post('/', verifyToken, requireRole('admin'), controller.addTask);
router.put('/:id', verifyToken, controller.updateTaskStatus);
router.delete('/:id', verifyToken, requireRole('admin'), controller.deleteTask);

module.exports = router;

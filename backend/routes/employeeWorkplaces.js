const express = require('express');
const router = express.Router();
const controller = require('../controllers/employeeWorkplaceController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, controller.getAllRelations);
router.post('/', verifyToken, requireRole('admin'), controller.assignEmployeeToContract);
router.delete('/:id', verifyToken, requireRole('admin'), controller.removeRelation);

module.exports = router;

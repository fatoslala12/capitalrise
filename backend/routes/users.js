const express = require('express');
const router = express.Router();
const controller = require('../controllers/usersController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('admin'), controller.getAllUsers);
router.post('/', verifyToken, requireRole('admin'), controller.createUser);
router.put('/:id', verifyToken, requireRole('admin'), controller.updateUser);
router.delete('/:id', verifyToken, requireRole('admin'), controller.deleteUser);
router.post('/', verifyToken, requireRole('admin'), controller.addUser);
router.post('/reset-password', verifyToken, requireRole('admin'), controller.resetPassword);

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await require('../db/db').query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Email ose fjalëkalim i pasaktë' });
    }

    res.json({
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      workplace: user.workplace || [],
      token: 'dummy-token-for-now'
    });
  } catch (err) {
    console.error("Gabim gjatë login:", err);
    res.status(500).json({ error: "Gabim serveri" });
  }
});


module.exports = router;

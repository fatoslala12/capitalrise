const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getCustomThemes,
  getCustomTheme,
  createCustomTheme,
  updateCustomTheme,
  deleteCustomTheme,
  setActiveTheme,
  getActiveTheme
} = require('../controllers/themeController');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all custom themes for user
router.get('/', getCustomThemes);

// Get specific custom theme
router.get('/:themeId', getCustomTheme);

// Create new custom theme
router.post('/', createCustomTheme);

// Update custom theme
router.put('/:themeId', updateCustomTheme);

// Delete custom theme
router.delete('/:themeId', deleteCustomTheme);

// Set active theme
router.post('/active', setActiveTheme);

// Get active theme
router.get('/active/current', getActiveTheme);

module.exports = router;

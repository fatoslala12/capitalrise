const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get all custom themes for a user
const getCustomThemes = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT id, name, colors, is_public, created_at, updated_at
      FROM custom_themes 
      WHERE user_id = $1 OR is_public = TRUE
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    const themes = result.rows;
    
    res.json({
      success: true,
      data: themes
    });
  } catch (error) {
    console.error('Error fetching custom themes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom themes'
    });
  }
};

// Get a specific custom theme
const getCustomTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    const userId = req.user.id;
    
    const query = `
      SELECT id, name, colors, is_public, created_at, updated_at
      FROM custom_themes 
      WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)
    `;
    
    const result = await db.query(query, [themeId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching custom theme:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom theme'
    });
  }
};

// Create a new custom theme
const createCustomTheme = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, colors, is_public = false } = req.body;
    
    if (!name || !colors) {
      return res.status(400).json({
        success: false,
        message: 'Name and colors are required'
      });
    }
    
    const query = `
      INSERT INTO custom_themes (user_id, name, colors, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, colors, is_public, created_at
    `;
    
    const result = await db.query(query, [userId, name, JSON.stringify(colors), is_public]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating custom theme:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating custom theme'
    });
  }
};

// Update a custom theme
const updateCustomTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    const userId = req.user.id;
    const { name, colors, is_public } = req.body;
    
    // Check if theme exists and belongs to user
    const checkQuery = 'SELECT id FROM custom_themes WHERE id = $1 AND user_id = $2';
    const checkResult = await db.query(checkQuery, [themeId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found or access denied'
      });
    }
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${++paramCount}`);
      updateValues.push(name);
    }
    
    if (colors !== undefined) {
      updateFields.push(`colors = $${++paramCount}`);
      updateValues.push(JSON.stringify(colors));
    }
    
    if (is_public !== undefined) {
      updateFields.push(`is_public = $${++paramCount}`);
      updateValues.push(is_public);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    updateValues.push(themeId);
    
    const query = `
      UPDATE custom_themes 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await db.query(query, updateValues);
    
    res.json({
      success: true,
      message: 'Theme updated successfully'
    });
  } catch (error) {
    console.error('Error updating custom theme:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating custom theme'
    });
  }
};

// Delete a custom theme
const deleteCustomTheme = async (req, res) => {
  try {
    const { themeId } = req.params;
    const userId = req.user.id;
    
    // Check if theme exists and belongs to user
    const checkQuery = 'SELECT id FROM custom_themes WHERE id = $1 AND user_id = $2';
    const checkResult = await db.query(checkQuery, [themeId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found or access denied'
      });
    }
    
    const query = 'DELETE FROM custom_themes WHERE id = $1 AND user_id = $2';
    await db.query(query, [themeId, userId]);
    
    res.json({
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom theme:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting custom theme'
    });
  }
};

// Set active theme for user
const setActiveTheme = async (req, res) => {
  try {
    const userId = req.user.id;
    const { themeId, themeType } = req.body; // themeType: 'preset' or 'custom'
    
    // Store active theme preference
    const query = `
      INSERT INTO user_preferences (user_id, preference_key, preference_value, updated_at)
      VALUES ($1, 'active_theme', $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, preference_key) 
      DO UPDATE SET preference_value = EXCLUDED.preference_value, updated_at = CURRENT_TIMESTAMP
    `;
    
    const themeData = {
      type: themeType,
      id: themeId
    };
    
    await db.query(query, [userId, JSON.stringify(themeData)]);
    
    res.json({
      success: true,
      message: 'Active theme updated successfully'
    });
  } catch (error) {
    console.error('Error setting active theme:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting active theme'
    });
  }
};

// Get active theme for user
const getActiveTheme = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT preference_value 
      FROM user_preferences 
      WHERE user_id = $1 AND preference_key = 'active_theme'
    `;
    
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          type: 'preset',
          id: 'light'
        }
      });
    }
    
    res.json({
      success: true,
      data: JSON.parse(result.rows[0].preference_value)
    });
  } catch (error) {
    console.error('Error getting active theme:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting active theme'
    });
  }
};

module.exports = {
  getCustomThemes,
  getCustomTheme,
  createCustomTheme,
  updateCustomTheme,
  deleteCustomTheme,
  setActiveTheme,
  getActiveTheme
};

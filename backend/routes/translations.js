const express = require('express');
const router = express.Router();
const translationService = require('../services/translationService');
const { verifyToken, requireRole } = require('../middleware/auth');

// Initialize translations table (admin only)
router.post('/initialize', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await translationService.initializeTranslationsTable();
    res.json({ 
      message: 'Translations table initialized successfully',
      success: true 
    });
  } catch (error) {
    console.error('Error initializing translations:', error);
    res.status(500).json({ 
      error: 'Failed to initialize translations table',
      details: error.message 
    });
  }
});

// Get translation for a specific field
router.get('/:tableName/:recordId/:fieldName', verifyToken, async (req, res) => {
  try {
    const { tableName, recordId, fieldName } = req.params;
    const { language = 'sq' } = req.query;
    
    const translation = await translationService.getTranslation(
      tableName, 
      parseInt(recordId), 
      fieldName, 
      language
    );
    
    res.json({ 
      translation,
      tableName,
      recordId: parseInt(recordId),
      fieldName,
      language 
    });
    
  } catch (error) {
    console.error('Error getting translation:', error);
    res.status(500).json({ 
      error: 'Failed to get translation',
      details: error.message 
    });
  }
});

// Get all translations for a record
router.get('/:tableName/:recordId', verifyToken, async (req, res) => {
  try {
    const { tableName, recordId } = req.params;
    const { language = 'sq' } = req.query;
    
    const translations = await translationService.getRecordTranslations(
      tableName, 
      parseInt(recordId), 
      language
    );
    
    res.json({ 
      translations,
      tableName,
      recordId: parseInt(recordId),
      language 
    });
    
  } catch (error) {
    console.error('Error getting record translations:', error);
    res.status(500).json({ 
      error: 'Failed to get record translations',
      details: error.message 
    });
  }
});

// Get translations for multiple records
router.post('/batch', verifyToken, async (req, res) => {
  try {
    const { tableName, recordIds, language = 'sq' } = req.body;
    
    if (!tableName || !recordIds || !Array.isArray(recordIds)) {
      return res.status(400).json({ 
        error: 'Invalid request. tableName and recordIds array are required.' 
      });
    }
    
    const translations = await translationService.getMultipleRecordTranslations(
      tableName, 
      recordIds, 
      language
    );
    
    res.json({ 
      translations,
      tableName,
      recordIds,
      language 
    });
    
  } catch (error) {
    console.error('Error getting batch translations:', error);
    res.status(500).json({ 
      error: 'Failed to get batch translations',
      details: error.message 
    });
  }
});

// Insert or update translation
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { tableName, recordId, fieldName, languageCode, translatedValue } = req.body;
    
    if (!tableName || !recordId || !fieldName || !languageCode) {
      return res.status(400).json({ 
        error: 'Missing required fields: tableName, recordId, fieldName, languageCode' 
      });
    }
    
    await translationService.insertTranslation(
      tableName, 
      parseInt(recordId), 
      fieldName, 
      languageCode, 
      translatedValue
    );
    
    res.json({ 
      message: 'Translation saved successfully',
      success: true,
      data: { tableName, recordId: parseInt(recordId), fieldName, languageCode, translatedValue }
    });
    
  } catch (error) {
    console.error('Error saving translation:', error);
    res.status(500).json({ 
      error: 'Failed to save translation',
      details: error.message 
    });
  }
});

// Update translation
router.put('/:tableName/:recordId/:fieldName/:languageCode', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { tableName, recordId, fieldName, languageCode } = req.params;
    const { translatedValue } = req.body;
    
    if (translatedValue === undefined) {
      return res.status(400).json({ 
        error: 'translatedValue is required' 
      });
    }
    
    const updated = await translationService.updateTranslation(
      tableName, 
      parseInt(recordId), 
      fieldName, 
      languageCode, 
      translatedValue
    );
    
    if (updated) {
      res.json({ 
        message: 'Translation updated successfully',
        success: true,
        data: { tableName, recordId: parseInt(recordId), fieldName, languageCode, translatedValue }
      });
    } else {
      res.status(404).json({ 
        error: 'Translation not found' 
      });
    }
    
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ 
      error: 'Failed to update translation',
      details: error.message 
    });
  }
});

// Delete translation
router.delete('/:tableName/:recordId/:fieldName/:languageCode', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { tableName, recordId, fieldName, languageCode } = req.params;
    
    const deleted = await translationService.deleteTranslation(
      tableName, 
      parseInt(recordId), 
      fieldName, 
      languageCode
    );
    
    if (deleted) {
      res.json({ 
        message: 'Translation deleted successfully',
        success: true 
      });
    } else {
      res.status(404).json({ 
        error: 'Translation not found' 
      });
    }
    
  } catch (error) {
    console.error('Error deleting translation:', error);
    res.status(500).json({ 
      error: 'Failed to delete translation',
      details: error.message 
    });
  }
});

// Delete all translations for a record
router.delete('/:tableName/:recordId', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { tableName, recordId } = req.params;
    
    const deletedCount = await translationService.deleteRecordTranslations(
      tableName, 
      parseInt(recordId)
    );
    
    res.json({ 
      message: `${deletedCount} translations deleted successfully`,
      success: true,
      deletedCount 
    });
    
  } catch (error) {
    console.error('Error deleting record translations:', error);
    res.status(500).json({ 
      error: 'Failed to delete record translations',
      details: error.message 
    });
  }
});

// Get available languages
router.get('/languages', verifyToken, async (req, res) => {
  try {
    const languages = await translationService.getAvailableLanguages();
    
    res.json({ 
      languages,
      success: true 
    });
    
  } catch (error) {
    console.error('Error getting available languages:', error);
    res.status(500).json({ 
      error: 'Failed to get available languages',
      details: error.message 
    });
  }
});

// Get translation statistics
router.get('/stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = await translationService.getTranslationStats();
    
    res.json({ 
      stats,
      success: true 
    });
    
  } catch (error) {
    console.error('Error getting translation stats:', error);
    res.status(500).json({ 
      error: 'Failed to get translation stats',
      details: error.message 
    });
  }
});

// Migrate existing data to translations table
router.post('/migrate', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await translationService.migrateExistingData();
    
    res.json({ 
      message: 'Data migration completed successfully',
      success: true 
    });
    
  } catch (error) {
    console.error('Error during data migration:', error);
    res.status(500).json({ 
      error: 'Failed to migrate data',
      details: error.message 
    });
  }
});

module.exports = router;
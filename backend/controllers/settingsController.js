const db = require('../db');

// Get system settings
const getSystemSettings = async (req, res) => {
  try {
    // For now, return default settings
    // In a real implementation, you would fetch from database
    const settings = {
      companyInfo: {
        name: 'Capital Rise',
        logo: '',
        address: '',
        city: '',
        country: 'Albania',
        zipCode: '',
        phone: '',
        email: '',
        website: '',
        taxNumber: '',
        registrationNumber: ''
      },
      workHoursRules: {
        standardHoursPerDay: 8,
        standardHoursPerWeek: 40,
        overtimeThreshold: 40,
        overtimeMultiplier: 1.5,
        breakTimeMinutes: 30,
        maxHoursPerDay: 12,
        weekendWorkAllowed: false,
        holidayWorkAllowed: false,
        nightShiftStart: '22:00',
        nightShiftEnd: '06:00',
        nightShiftMultiplier: 1.25
      },
      securitySettings: {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSymbols: false,
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
        twoFactorAuthRequired: false,
        passwordExpiryDays: 90,
        requirePasswordChangeOnFirstLogin: true
      },
      backupSettings: {
        autoBackupEnabled: true,
        backupFrequency: 'daily',
        backupTime: '02:00',
        backupRetentionDays: 30,
        backupLocation: 'local',
        includeUserData: true,
        includeSystemData: true,
        backupCompression: true,
        backupEncryption: false
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error getting system settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving system settings',
      error: error.message 
    });
  }
};

// Update company information
const updateCompanyInfo = async (req, res) => {
  try {
    const { name, logo, address, city, country, zipCode, phone, email, website, taxNumber, registrationNumber } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    // In a real implementation, you would update the database
    // For now, just return success
    console.log('Company info updated:', {
      name, logo, address, city, country, zipCode, phone, email, website, taxNumber, registrationNumber
    });

    res.json({
      success: true,
      message: 'Company information updated successfully'
    });
  } catch (error) {
    console.error('Error updating company info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating company information',
      error: error.message 
    });
  }
};

// Update work hours rules
const updateWorkHoursRules = async (req, res) => {
  try {
    const {
      standardHoursPerDay,
      standardHoursPerWeek,
      overtimeThreshold,
      overtimeMultiplier,
      breakTimeMinutes,
      maxHoursPerDay,
      weekendWorkAllowed,
      holidayWorkAllowed,
      nightShiftStart,
      nightShiftEnd,
      nightShiftMultiplier
    } = req.body;

    // Validate numeric values
    if (standardHoursPerDay < 1 || standardHoursPerDay > 24) {
      return res.status(400).json({
        success: false,
        message: 'Standard hours per day must be between 1 and 24'
      });
    }

    if (standardHoursPerWeek < 1 || standardHoursPerWeek > 168) {
      return res.status(400).json({
        success: false,
        message: 'Standard hours per week must be between 1 and 168'
      });
    }

    if (overtimeMultiplier < 1 || overtimeMultiplier > 5) {
      return res.status(400).json({
        success: false,
        message: 'Overtime multiplier must be between 1 and 5'
      });
    }

    // In a real implementation, you would update the database
    console.log('Work hours rules updated:', {
      standardHoursPerDay,
      standardHoursPerWeek,
      overtimeThreshold,
      overtimeMultiplier,
      breakTimeMinutes,
      maxHoursPerDay,
      weekendWorkAllowed,
      holidayWorkAllowed,
      nightShiftStart,
      nightShiftEnd,
      nightShiftMultiplier
    });

    res.json({
      success: true,
      message: 'Work hours rules updated successfully'
    });
  } catch (error) {
    console.error('Error updating work hours rules:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating work hours rules',
      error: error.message 
    });
  }
};

// Update security settings
const updateSecuritySettings = async (req, res) => {
  try {
    const {
      passwordMinLength,
      passwordRequireUppercase,
      passwordRequireLowercase,
      passwordRequireNumbers,
      passwordRequireSymbols,
      sessionTimeoutMinutes,
      maxLoginAttempts,
      lockoutDurationMinutes,
      twoFactorAuthRequired,
      passwordExpiryDays,
      requirePasswordChangeOnFirstLogin
    } = req.body;

    // Validate password requirements
    if (passwordMinLength < 6 || passwordMinLength > 32) {
      return res.status(400).json({
        success: false,
        message: 'Password minimum length must be between 6 and 32'
      });
    }

    if (sessionTimeoutMinutes < 5 || sessionTimeoutMinutes > 480) {
      return res.status(400).json({
        success: false,
        message: 'Session timeout must be between 5 and 480 minutes'
      });
    }

    if (maxLoginAttempts < 3 || maxLoginAttempts > 20) {
      return res.status(400).json({
        success: false,
        message: 'Max login attempts must be between 3 and 20'
      });
    }

    // In a real implementation, you would update the database
    console.log('Security settings updated:', {
      passwordMinLength,
      passwordRequireUppercase,
      passwordRequireLowercase,
      passwordRequireNumbers,
      passwordRequireSymbols,
      sessionTimeoutMinutes,
      maxLoginAttempts,
      lockoutDurationMinutes,
      twoFactorAuthRequired,
      passwordExpiryDays,
      requirePasswordChangeOnFirstLogin
    });

    res.json({
      success: true,
      message: 'Security settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating security settings',
      error: error.message 
    });
  }
};

// Update backup settings
const updateBackupSettings = async (req, res) => {
  try {
    const {
      autoBackupEnabled,
      backupFrequency,
      backupTime,
      backupRetentionDays,
      backupLocation,
      includeUserData,
      includeSystemData,
      backupCompression,
      backupEncryption
    } = req.body;

    // Validate backup frequency
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(backupFrequency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup frequency'
      });
    }

    if (backupRetentionDays < 1 || backupRetentionDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Backup retention days must be between 1 and 365'
      });
    }

    // In a real implementation, you would update the database
    console.log('Backup settings updated:', {
      autoBackupEnabled,
      backupFrequency,
      backupTime,
      backupRetentionDays,
      backupLocation,
      includeUserData,
      includeSystemData,
      backupCompression,
      backupEncryption
    });

    res.json({
      success: true,
      message: 'Backup settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating backup settings',
      error: error.message 
    });
  }
};

module.exports = {
  getSystemSettings,
  updateCompanyInfo,
  updateWorkHoursRules,
  updateSecuritySettings,
  updateBackupSettings
};

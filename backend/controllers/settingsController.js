const pool = require('../config/database');

// Merr të gjitha system settings
exports.getSystemSettings = async (req, res) => {
  try {
    const { user } = req;
    
    console.log(`[SETTINGS] Përdoruesi ${user.email} po merr system settings`);

    // Merr settings nga databaza
    const result = await pool.query(
      'SELECT * FROM system_settings WHERE id = 1'
    );
    
    if (result.rows.length === 0) {
      // Krijo default settings nëse nuk ekzistojnë
      const defaultSettings = {
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
        },
        performanceSettings: {
          cacheEnabled: true,
          cacheExpirationMinutes: 60,
          maxConcurrentUsers: 100,
          sessionCleanupInterval: 30,
          logRetentionDays: 90,
          enableDebugMode: false,
          enableMaintenanceMode: false,
          systemOptimization: true,
          memoryLimit: 512,
          cpuLimit: 80
        },
        emailSettings: {
          smtpHost: '',
          smtpPort: 587,
          smtpUsername: '',
          smtpPassword: '',
          smtpSecure: true,
          fromEmail: '',
          fromName: 'Capital Rise System',
          emailQueueEnabled: true,
          maxEmailsPerHour: 100,
          emailRetryAttempts: 3
        },
        maintenanceSettings: {
          maintenanceMode: false,
          maintenanceMessage: 'System is under maintenance. Please try again later.',
          scheduledMaintenance: false,
          maintenanceStartTime: '',
          maintenanceEndTime: '',
          autoRestartEnabled: false,
          restartTime: '03:00',
          healthCheckInterval: 5,
          alertThresholds: {
            cpuUsage: 80,
            memoryUsage: 85,
            diskUsage: 90
          }
        }
      };

      // Krijo default settings në databazë
      await pool.query(
        `INSERT INTO system_settings (id, company_info, work_hours_rules, security_settings, backup_settings, performance_settings, email_settings, maintenance_settings, created_at, updated_at)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          JSON.stringify(defaultSettings.companyInfo),
          JSON.stringify(defaultSettings.workHoursRules),
          JSON.stringify(defaultSettings.securitySettings),
          JSON.stringify(defaultSettings.backupSettings),
          JSON.stringify(defaultSettings.performanceSettings),
          JSON.stringify(defaultSettings.emailSettings),
          JSON.stringify(defaultSettings.maintenanceSettings)
        ]
      );

      return res.json({
        success: true,
        data: defaultSettings
      });
    }

    const settings = result.rows[0];
    
    res.json({
      success: true,
      data: {
        companyInfo: settings.company_info,
        workHoursRules: settings.work_hours_rules,
        securitySettings: settings.security_settings,
        backupSettings: settings.backup_settings,
        performanceSettings: settings.performance_settings,
        emailSettings: settings.email_settings,
        maintenanceSettings: settings.maintenance_settings
      }
    });

  } catch (error) {
    console.error('[ERROR] Gabim në marrjen e system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë marrjes së system settings',
      error: error.message
    });
  }
};

// Ruaj company info settings
exports.updateCompanyInfo = async (req, res) => {
  try {
    const { user } = req;
    const companyInfo = req.body;
    
    console.log(`[SETTINGS] Përdoruesi ${user.email} po përditëson company info`);

    await pool.query(
      'UPDATE system_settings SET company_info = $1, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(companyInfo)]
    );

    res.json({
      success: true,
      message: 'Company information u përditësua me sukses',
      data: companyInfo
    });

  } catch (error) {
    console.error('[ERROR] Gabim në përditësimin e company info:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë përditësimit të company info',
      error: error.message
    });
  }
};

// Ruaj work hours rules
exports.updateWorkHoursRules = async (req, res) => {
  try {
    const { user } = req;
    const workHoursRules = req.body;
    
    console.log(`[SETTINGS] Përdoruesi ${user.email} po përditëson work hours rules`);

    await pool.query(
      'UPDATE system_settings SET work_hours_rules = $1, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(workHoursRules)]
    );

    res.json({
      success: true,
      message: 'Work hours rules u përditësuan me sukses',
      data: workHoursRules
    });

  } catch (error) {
    console.error('[ERROR] Gabim në përditësimin e work hours rules:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë përditësimit të work hours rules',
      error: error.message
    });
  }
};

// Ruaj security settings
exports.updateSecuritySettings = async (req, res) => {
  try {
    const { user } = req;
    const securitySettings = req.body;
    
    console.log(`[SETTINGS] Përdoruesi ${user.email} po përditëson security settings`);

    await pool.query(
      'UPDATE system_settings SET security_settings = $1, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(securitySettings)]
    );

    res.json({
      success: true,
      message: 'Security settings u përditësuan me sukses',
      data: securitySettings
    });

  } catch (error) {
    console.error('[ERROR] Gabim në përditësimin e security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë përditësimit të security settings',
      error: error.message
    });
  }
};

// Ruaj backup settings
exports.updateBackupSettings = async (req, res) => {
  try {
    const { user } = req;
    const backupSettings = req.body;
    
    console.log(`[SETTINGS] Përdoruesi ${user.email} po përditëson backup settings`);

    await pool.query(
      'UPDATE system_settings SET backup_settings = $1, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(backupSettings)]
    );

    res.json({
      success: true,
      message: 'Backup settings u përditësuan me sukses',
      data: backupSettings
    });

  } catch (error) {
    console.error('[ERROR] Gabim në përditësimin e backup settings:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë përditësimit të backup settings',
      error: error.message
    });
  }
};

// Ruaj performance settings
exports.updatePerformanceSettings = async (req, res) => {
  try {
    const { user } = req;
    const performanceSettings = req.body;
    
    console.log(`[SETTINGS] Përdoruesi ${user.email} po përditëson performance settings`);

    await pool.query(
      'UPDATE system_settings SET performance_settings = $1, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(performanceSettings)]
    );

    res.json({
      success: true,
      message: 'Performance settings u përditësuan me sukses',
      data: performanceSettings
    });

  } catch (error) {
    console.error('[ERROR] Gabim në përditësimin e performance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë përditësimit të performance settings',
      error: error.message
    });
  }
};

// Ruaj email settings
exports.updateEmailSettings = async (req, res) => {
  try {
    const { user } = req;
    const emailSettings = req.body;
    
    console.log(`[SETTINGS] Përdoruesi ${user.email} po përditëson email settings`);

    await pool.query(
      'UPDATE system_settings SET email_settings = $1, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(emailSettings)]
    );

    res.json({
      success: true,
      message: 'Email settings u përditësuan me sukses',
      data: emailSettings
    });

  } catch (error) {
    console.error('[ERROR] Gabim në përditësimin e email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë përditësimit të email settings',
      error: error.message
    });
  }
};

// Ruaj maintenance settings
exports.updateMaintenanceSettings = async (req, res) => {
  try {
    const { user } = req;
    const maintenanceSettings = req.body;
    
    console.log(`[SETTINGS] Përdoruesi ${user.email} po përditëson maintenance settings`);

    await pool.query(
      'UPDATE system_settings SET maintenance_settings = $1, updated_at = NOW() WHERE id = 1',
      [JSON.stringify(maintenanceSettings)]
    );

    res.json({
      success: true,
      message: 'Maintenance settings u përditësuan me sukses',
      data: maintenanceSettings
    });

  } catch (error) {
    console.error('[ERROR] Gabim në përditësimin e maintenance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë përditësimit të maintenance settings',
      error: error.message
    });
  }
};
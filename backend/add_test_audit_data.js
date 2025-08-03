const db = require('./db');

async function addTestAuditData() {
  try {
    console.log('Adding test audit data...');

    const testData = [
      // Successful activities
      {
        action: 'CREATE',
        entity_type: 'contracts',
        entity_id: '1',
        description: 'Kontratë e re u krijua për punonjësin e ri',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.100',
        old_values: null,
        new_values: { contractNumber: 'CTR-2024-001', employeeId: 5, amount: 2500 },
        changes: { contractNumber: 'CTR-2024-001', employeeId: 5, amount: 2500 },
        metadata: { contractNumber: 'CTR-2024-001', employeeId: 5, amount: 2500 }
      },
      {
        action: 'UPDATE',
        entity_type: 'employees',
        entity_id: '3',
        description: 'Përditësimi i informacioneve të punonjësit',
        user_id: 38,
        user_email: 'pellumblala@hotmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.101',
        old_values: { hourlyRate: 15, workplace: 'Office A' },
        new_values: { hourlyRate: 18, workplace: 'Office B' },
        changes: { hourlyRate: { from: 15, to: 18 }, workplace: { from: 'Office A', to: 'Office B' } },
        metadata: { changes: ['hourlyRate', 'workplace'], oldValue: 15, newValue: 18 }
      },
      {
        action: 'DELETE',
        entity_type: 'tasks',
        entity_id: '12',
        description: 'Detyrë u fshi nga lista',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'warning',
        ip_address: '192.168.1.102',
        old_values: { taskId: 12, title: 'Complete project', status: 'pending' },
        new_values: null,
        changes: { deleted: true, reason: 'Completed' },
        metadata: { taskId: 12, reason: 'Completed' }
      },
      {
        action: 'LOGIN_SUCCESS',
        entity_type: 'auth',
        entity_id: null,
        description: 'Përdorues u kyç në sistem me sukses',
        user_id: 35,
        user_email: 'andi@gmail.com',
        user_role: 'user',
        severity: 'info',
        ip_address: '192.168.1.103',
        old_values: null,
        new_values: { loginTime: new Date().toISOString() },
        changes: { loginTime: new Date().toISOString() },
        metadata: { loginTime: new Date().toISOString(), userAgent: 'Chrome/120.0' }
      },
      {
        action: 'PAYMENT',
        entity_type: 'payments',
        entity_id: '8',
        description: 'Pagesë u procesua me sukses',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.104',
        old_values: null,
        new_values: { paymentId: 8, amount: 1500, method: 'bank_transfer' },
        changes: { paymentId: 8, amount: 1500, method: 'bank_transfer' },
        metadata: { paymentId: 8, amount: 1500, method: 'bank_transfer' }
      },
      {
        action: 'EXPORT',
        entity_type: 'reports',
        entity_id: null,
        description: 'Raport u eksportua në Excel',
        user_id: 38,
        user_email: 'pellumblala@hotmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.105',
        old_values: null,
        new_values: { reportType: 'monthly', format: 'excel', records: 150 },
        changes: { reportType: 'monthly', format: 'excel', records: 150 },
        metadata: { reportType: 'monthly', format: 'excel', records: 150 }
      },
      {
        action: 'IMPORT',
        entity_type: 'employees',
        entity_id: null,
        description: 'Import i listës së punonjësve',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.106',
        old_values: null,
        new_values: { source: 'hr_system', fileType: 'csv', importedRecords: 25 },
        changes: { source: 'hr_system', fileType: 'csv', importedRecords: 25 },
        metadata: { source: 'hr_system', fileType: 'csv', importedRecords: 25 }
      },
      {
        action: 'BACKUP',
        entity_type: 'backup',
        entity_id: null,
        description: 'Backup automatik i databazës',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.107',
        old_values: null,
        new_values: { status: 'success', duration: '5m 30s', backupSize: '2.5GB' },
        changes: { status: 'success', duration: '5m 30s', backupSize: '2.5GB' },
        metadata: { status: 'success', duration: '5m 30s', backupSize: '2.5GB' }
      },
      {
        action: 'RESTORE',
        entity_type: 'backup',
        entity_id: null,
        description: 'Rikthimi i databazës nga backup',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'high',
        ip_address: '192.168.1.108',
        old_values: null,
        new_values: { backupId: 'BK-2024-001', restorePoint: '2024-01-15 10:30:00' },
        changes: { backupId: 'BK-2024-001', restorePoint: '2024-01-15 10:30:00' },
        metadata: { backupId: 'BK-2024-001', restorePoint: '2024-01-15 10:30:00' }
      },
      {
        action: 'UPDATE',
        entity_type: 'settings',
        entity_id: null,
        description: 'Konfigurimi i sistemit u ndryshua',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'warning',
        ip_address: '192.168.1.109',
        old_values: { setting: 'email_notifications', value: false },
        new_values: { setting: 'email_notifications', value: true },
        changes: { setting: 'email_notifications', oldValue: false, newValue: true },
        metadata: { setting: 'email_notifications', oldValue: false, newValue: true }
      },
      // Failed login attempts
      {
        action: 'LOGIN_FAILED',
        entity_type: 'auth',
        entity_id: null,
        description: 'Tentativë e pasuksesshme e kyçjes',
        user_id: null,
        user_email: 'unknown@example.com',
        user_role: 'unknown',
        severity: 'warning',
        ip_address: '203.45.67.89',
        old_values: null,
        new_values: { attemptTime: new Date().toISOString(), reason: 'Invalid password' },
        changes: { attemptTime: new Date().toISOString(), reason: 'Invalid password' },
        metadata: { attemptTime: new Date().toISOString(), reason: 'Invalid password', userAgent: 'Firefox/115.0' }
      },
      {
        action: 'LOGIN_FAILED',
        entity_type: 'auth',
        entity_id: null,
        description: 'Tentativë e pasuksesshme e kyçjes',
        user_id: null,
        user_email: 'test@example.com',
        user_role: 'unknown',
        severity: 'warning',
        ip_address: '185.32.45.123',
        old_values: null,
        new_values: { attemptTime: new Date().toISOString(), reason: 'User not found' },
        changes: { attemptTime: new Date().toISOString(), reason: 'User not found' },
        metadata: { attemptTime: new Date().toISOString(), reason: 'User not found', userAgent: 'Safari/16.0' }
      },
      {
        action: 'LOGIN_FAILED',
        entity_type: 'auth',
        entity_id: null,
        description: 'Tentativë e pasuksesshme e kyçjes',
        user_id: null,
        user_email: 'admin@test.com',
        user_role: 'unknown',
        severity: 'warning',
        ip_address: '92.168.1.50',
        old_values: null,
        new_values: { attemptTime: new Date().toISOString(), reason: 'Account locked' },
        changes: { attemptTime: new Date().toISOString(), reason: 'Account locked' },
        metadata: { attemptTime: new Date().toISOString(), reason: 'Account locked', userAgent: 'Chrome/120.0' }
      },
      {
        action: 'LOGIN_FAILED',
        entity_type: 'auth',
        entity_id: null,
        description: 'Tentativë e pasuksesshme e kyçjes',
        user_id: null,
        user_email: 'user@test.com',
        user_role: 'unknown',
        severity: 'warning',
        ip_address: '45.67.89.12',
        old_values: null,
        new_values: { attemptTime: new Date().toISOString(), reason: 'Invalid credentials' },
        changes: { attemptTime: new Date().toISOString(), reason: 'Invalid credentials' },
        metadata: { attemptTime: new Date().toISOString(), reason: 'Invalid credentials', userAgent: 'Edge/120.0' }
      },
      {
        action: 'LOGIN_FAILED',
        entity_type: 'auth',
        entity_id: null,
        description: 'Tentativë e pasuksesshme e kyçjes',
        user_id: null,
        user_email: 'test@example.com',
        user_role: 'unknown',
        severity: 'warning',
        ip_address: '185.32.45.123',
        old_values: null,
        new_values: { attemptTime: new Date().toISOString(), reason: 'Too many attempts' },
        changes: { attemptTime: new Date().toISOString(), reason: 'Too many attempts' },
        metadata: { attemptTime: new Date().toISOString(), reason: 'Too many attempts', userAgent: 'Safari/16.0' }
      },
      // More diverse activities
      {
        action: 'CREATE',
        entity_type: 'employees',
        entity_id: '15',
        description: 'Punonjës i ri u shtua në sistem',
        user_id: 38,
        user_email: 'pellumblala@hotmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.110',
        old_values: null,
        new_values: { employeeId: 15, name: 'Ana Gjoka', position: 'Developer' },
        changes: { employeeId: 15, name: 'Ana Gjoka', position: 'Developer' },
        metadata: { employeeId: 15, name: 'Ana Gjoka', position: 'Developer' }
      },
      {
        action: 'UPDATE',
        entity_type: 'contracts',
        entity_id: '5',
        description: 'Kontratë u përditësua',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.111',
        old_values: { amount: 2000, duration: '6 months' },
        new_values: { amount: 2500, duration: '12 months' },
        changes: { amount: { from: 2000, to: 2500 }, duration: { from: '6 months', to: '12 months' } },
        metadata: { amount: { from: 2000, to: 2500 }, duration: { from: '6 months', to: '12 months' } }
      },
      {
        action: 'DELETE',
        entity_type: 'employees',
        entity_id: '8',
        description: 'Punonjës u fshi nga sistemi',
        user_id: 38,
        user_email: 'pellumblala@hotmail.com',
        user_role: 'manager',
        severity: 'warning',
        ip_address: '192.168.1.112',
        old_values: { employeeId: 8, name: 'Mark Doda', status: 'active' },
        new_values: null,
        changes: { deleted: true, reason: 'Resigned' },
        metadata: { employeeId: 8, reason: 'Resigned' }
      },
      {
        action: 'PAYMENT',
        entity_type: 'payments',
        entity_id: '12',
        description: 'Pagesë e re u procesua',
        user_id: 35,
        user_email: 'andi@gmail.com',
        user_role: 'user',
        severity: 'info',
        ip_address: '192.168.1.113',
        old_values: null,
        new_values: { paymentId: 12, amount: 800, method: 'cash' },
        changes: { paymentId: 12, amount: 800, method: 'cash' },
        metadata: { paymentId: 12, amount: 800, method: 'cash' }
      },
      {
        action: 'EXPORT',
        entity_type: 'reports',
        entity_id: null,
        description: 'Raport i detajeve u eksportua',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.114',
        old_values: null,
        new_values: { reportType: 'detailed', format: 'pdf', records: 75 },
        changes: { reportType: 'detailed', format: 'pdf', records: 75 },
        metadata: { reportType: 'detailed', format: 'pdf', records: 75 }
      },
      {
        action: 'IMPORT',
        entity_type: 'contracts',
        entity_id: null,
        description: 'Import i kontratave nga sistemi i vjetër',
        user_id: 38,
        user_email: 'pellumblala@hotmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.115',
        old_values: null,
        new_values: { source: 'legacy_system', fileType: 'xlsx', importedRecords: 45 },
        changes: { source: 'legacy_system', fileType: 'xlsx', importedRecords: 45 },
        metadata: { source: 'legacy_system', fileType: 'xlsx', importedRecords: 45 }
      },
      {
        action: 'BACKUP',
        entity_type: 'backup',
        entity_id: null,
        description: 'Backup manual i databazës',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'info',
        ip_address: '192.168.1.116',
        old_values: null,
        new_values: { status: 'success', duration: '3m 45s', backupSize: '1.8GB' },
        changes: { status: 'success', duration: '3m 45s', backupSize: '1.8GB' },
        metadata: { status: 'success', duration: '3m 45s', backupSize: '1.8GB' }
      },
      {
        action: 'RESTORE',
        entity_type: 'backup',
        entity_id: null,
        description: 'Rikthimi i databazës nga backup manual',
        user_id: 38,
        user_email: 'pellumblala@hotmail.com',
        user_role: 'manager',
        severity: 'high',
        ip_address: '192.168.1.117',
        old_values: null,
        new_values: { backupId: 'BK-2024-002', restorePoint: '2024-01-20 14:15:00' },
        changes: { backupId: 'BK-2024-002', restorePoint: '2024-01-20 14:15:00' },
        metadata: { backupId: 'BK-2024-002', restorePoint: '2024-01-20 14:15:00' }
      },
      {
        action: 'UPDATE',
        entity_type: 'settings',
        entity_id: null,
        description: 'Konfigurimi i sigurisë u ndryshua',
        user_id: 36,
        user_email: 'admir@gmail.com',
        user_role: 'manager',
        severity: 'warning',
        ip_address: '192.168.1.118',
        old_values: { setting: 'password_policy', value: 'medium' },
        new_values: { setting: 'password_policy', value: 'high' },
        changes: { setting: 'password_policy', oldValue: 'medium', newValue: 'high' },
        metadata: { setting: 'password_policy', oldValue: 'medium', newValue: 'high' }
      }
    ];

    for (const data of testData) {
      const query = `
        INSERT INTO audit_trail (
          action, entity_type, entity_id, description, user_id, user_email, user_role,
          severity, ip_address, old_values, new_values, changes, metadata, timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `;

      await db.query(query, [
        data.action,
        data.entity_type,
        data.entity_id,
        data.description,
        data.user_id,
        data.user_email,
        data.user_role,
        data.severity,
        data.ip_address,
        data.old_values,
        data.new_values,
        data.changes,
        data.metadata
      ]);
    }

    console.log('✅ Test audit data added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test data:', error);
    process.exit(1);
  }
}

addTestAuditData();
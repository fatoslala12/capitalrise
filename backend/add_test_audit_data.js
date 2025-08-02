const db = require('./db');

async function addTestAuditData() {
  try {
    console.log('Adding test audit data...');

    const testData = [
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
        action: 'LOGIN',
        entity_type: 'auth',
        entity_id: null,
        description: 'Përdorues u kyç në sistem',
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
        new_values: { importedRecords: 25, fileType: 'csv', source: 'hr_system' },
        changes: { importedRecords: 25, fileType: 'csv', source: 'hr_system' },
        metadata: { importedRecords: 25, fileType: 'csv', source: 'hr_system' }
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
        new_values: { backupSize: '2.5GB', duration: '5m 30s', status: 'success' },
        changes: { backupSize: '2.5GB', duration: '5m 30s', status: 'success' },
        metadata: { backupSize: '2.5GB', duration: '5m 30s', status: 'success' }
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
        old_values: { email_notifications: false },
        new_values: { email_notifications: true },
        changes: { email_notifications: { from: false, to: true } },
        metadata: { setting: 'email_notifications', oldValue: false, newValue: true }
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
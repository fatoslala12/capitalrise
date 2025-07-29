const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Të gjitha routes kërkojnë autentikim
router.use(verifyToken);

// Merr audit logs me filtra - admin dhe manager
router.get('/logs', requireRole(['admin', 'manager']), auditController.getAuditLogs);

// Merr statistika të audit trail - admin dhe manager
router.get('/stats', requireRole(['admin', 'manager']), auditController.getAuditStats);

// Merr aktivitetin e përdoruesit - admin dhe manager
router.get('/user-activity', requireRole(['admin', 'manager']), auditController.getUserActivity);

// Merr entitetet më të aktivizuara - admin dhe manager
router.get('/most-active-entities', requireRole(['admin', 'manager']), auditController.getMostActiveEntities);

// Eksporto audit logs në CSV - admin dhe manager
router.get('/export-csv', requireRole(['admin', 'manager']), auditController.exportAuditLogsCSV);

// Detekto aktivitet të verdhësishëm - admin dhe manager
router.get('/suspicious-activity', requireRole(['admin', 'manager']), auditController.detectSuspiciousActivity);

// Pastro audit logs të vjetër - vetëm admin
router.post('/cleanup', requireRole('admin'), auditController.cleanupOldAuditLogs);

// Merr audit trail për një entitet specifik - admin dhe manager
router.get('/entity/:entityType/:entityId', requireRole(['admin', 'manager']), auditController.getEntityAuditTrail);

// Merr audit trail për një përdorues specifik - admin dhe manager
router.get('/user/:userId', requireRole(['admin', 'manager']), auditController.getUserAuditTrail);

// Merr raportin e audit trail - admin dhe manager
router.get('/report', requireRole(['admin', 'manager']), auditController.getAuditReport);

module.exports = router; 
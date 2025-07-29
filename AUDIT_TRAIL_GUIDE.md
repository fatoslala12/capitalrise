# 🔍 Sistemi i Audit Trail - Udhëzues i Plotë

## 📋 Përmbajtja

1. [Përmbledhje](#përmbledhje)
2. [Funksionalitete](#funksionalitete)
3. [Instalimi dhe Konfigurimi](#instalimi-dhe-konfigurimi)
4. [Përdorimi](#përdorimi)
5. [API Endpoints](#api-endpoints)
6. [Middleware](#middleware)
7. [Siguria](#siguria)
8. [Monitorimi](#monitorimi)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Përmbledhje

Sistemi i Audit Trail është një zgjidhje e plotë për gjurmimin e të gjitha veprimeve dhe ndryshimeve në sistemin e ndërtimit. Ai ofron:

- ✅ **Gjurmim automatik** i të gjitha veprimeve
- ✅ **Detajim i plotë** për çdo ndryshim
- ✅ **Detektim i aktivitetit të verdhësishëm**
- ✅ **Raportim dhe analizë** të avancuar
- ✅ **Eksportim** në formate të ndryshme
- ✅ **Siguri dhe compliance** të plotë

---

## 🚀 Funksionalitete

### **1. Gjurmim Automatik**
- **Login/Logout** - Gjurmim i të gjitha tentativave të autentikimit
- **CRUD Operations** - Krijim, përditësim, fshirje, lexim
- **Sensitive Operations** - Veprime kritike dhe të rëndësishme
- **System Events** - Ngjarje të sistemit dhe gabime

### **2. Detajim i Plotë**
- **Përdoruesi** - Kush ka bërë veprimin
- **Koha** - Kur është bërë veprimi
- **IP Address** - Nga ku është bërë veprimi
- **User Agent** - Çfarë aplikacioni është përdorur
- **Ndryshimet** - Çfarë ka ndryshuar
- **Vlerat e Vjetra dhe të Reja** - Krahasim i plotë

### **3. Detektim i Aktivitetit të Verdësishëm**
- **Login të dështuar** - Tentativa të shpeshta
- **Veprime të shpeshta** - Aktivitet i pazakontë
- **Aktivitet në natë** - Veprime në orët e pazakonta
- **Fshirje të shpeshta** - Veprime të rrezikshme

### **4. Raportim dhe Analizë**
- **Statistika** - Numri i veprimeve, përdoruesit, etj.
- **Grafikë** - Vizualizim i aktivitetit
- **Trends** - Analizë e zhvillimeve
- **Performance** - Monitorim i performancës

---

## ⚙️ Instalimi dhe Konfigurimi

### **1. Tabela e Audit Trail**

Sistemi krijon automatikisht tabelën `audit_trail`:

```sql
CREATE TABLE audit_trail (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255),
  severity VARCHAR(20) DEFAULT 'info',
  description TEXT,
  metadata JSONB
);
```

### **2. Indekset për Performancë**

```sql
CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
CREATE INDEX idx_audit_trail_severity ON audit_trail(severity);
```

### **3. Konfigurimi i Environment**

Shtoni në `.env`:
```env
# Audit Trail settings
AUDIT_RETENTION_DAYS=365
AUDIT_ENABLE_SUSPICIOUS_DETECTION=true
AUDIT_LOG_SENSITIVE_OPERATIONS=true
```

---

## 🎮 Përdorimi

### **1. Përmes UI (Frontend)**

#### **Shiko Audit Logs:**
1. Shko në **Admin Dashboard** → **🔍 Audit Trail**
2. Përdor filtra për të gjetur veprimet e dëshiruara
3. Shiko detajet e çdo veprimi

#### **Eksporto Raporte:**
1. Kliko **📊 Eksporto CSV**
2. Zgjidh filtrat e dëshiruara
3. Shkarko raportin

#### **Kontrollo Aktivitet të Verdësishëm:**
1. Shiko seksionin **⚠️ Aktivitet të Verdësishëm**
2. Analizo veprimet e verdhësishme
3. Merr masa nëse nevojiten

### **2. Përmes API**

#### **Merr Audit Logs:**
```bash
curl -X GET "http://localhost:5000/api/audit/logs?entityType=users&action=CREATE&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Merr Statistika:**
```bash
curl -X GET "http://localhost:5000/api/audit/stats?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Detekto Aktivitet të Verdësishëm:**
```bash
curl -X GET "http://localhost:5000/api/audit/suspicious-activity?hours=24" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **3. Përmes Middleware**

#### **Audit Automatik:**
```javascript
const { auditMiddleware } = require('../middleware/audit');

// Për routes specifike
router.post('/users', 
  auditMiddleware({ entityType: 'users', action: 'CREATE' }),
  userController.createUser
);

// Për sensitive operations
router.delete('/users/:id',
  sensitiveOperationAudit('DELETE_USER', 'users', 'Fshirje përdoruesi'),
  userController.deleteUser
);
```

---

## 🔌 API Endpoints

### **Audit Operations**

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/audit/logs` | Merr audit logs me filtra | Admin/Manager |
| `GET` | `/api/audit/stats` | Merr statistika | Admin/Manager |
| `GET` | `/api/audit/user-activity` | Aktiviteti i përdoruesit | Admin/Manager |
| `GET` | `/api/audit/most-active-entities` | Entitetet më aktive | Admin/Manager |
| `GET` | `/api/audit/export-csv` | Eksporto në CSV | Admin/Manager |
| `GET` | `/api/audit/suspicious-activity` | Aktivitet të verdësishëm | Admin/Manager |
| `POST` | `/api/audit/cleanup` | Pastro logs të vjetër | Admin |

### **Entity-specific**

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/audit/entity/:entityType/:entityId` | Audit trail për entitet | Admin/Manager |
| `GET` | `/api/audit/user/:userId` | Audit trail për përdorues | Admin/Manager |
| `GET` | `/api/audit/report` | Raport i plotë | Admin/Manager |

### **Response Format**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "user_email": "admin@example.com",
      "user_role": "admin",
      "action": "CREATE",
      "entity_type": "users",
      "entity_id": "456",
      "old_values": null,
      "new_values": { "name": "John Doe", "email": "john@example.com" },
      "changes": null,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "severity": "info",
      "description": "Krijuar përdorues i ri"
    }
  ],
  "count": 1
}
```

---

## 🔧 Middleware

### **1. Audit Middleware Automatik**

```javascript
const { auditMiddleware } = require('../middleware/audit');

// Përdorimi bazë
router.post('/contracts',
  auditMiddleware({ entityType: 'contracts' }),
  contractController.createContract
);

// Me opcione të avancuara
router.put('/contracts/:id',
  auditMiddleware({
    entityType: 'contracts',
    action: 'UPDATE_CONTRACT',
    entityIdField: 'id',
    customDescription: 'Përditësim kontrate'
  }),
  contractController.updateContract
);
```

### **2. Auth Audit Middleware**

```javascript
const { authAuditMiddleware } = require('../middleware/audit');

// Për login/logout
router.post('/login', authAuditMiddleware, authController.login);
router.post('/logout', authAuditMiddleware, authController.logout);
```

### **3. Sensitive Operation Audit**

```javascript
const { sensitiveOperationAudit } = require('../middleware/audit');

// Për veprime kritike
router.delete('/users/:id',
  sensitiveOperationAudit('DELETE_USER', 'users', 'Fshirje përdoruesi'),
  userController.deleteUser
);

router.post('/backup/restore/:filename',
  sensitiveOperationAudit('RESTORE_BACKUP', 'backup', 'Restore backup'),
  backupController.restoreBackup
);
```

### **4. Preserve Original Body**

```javascript
const { preserveOriginalBody } = require('../middleware/audit');

// Për të ruajtur vlerat origjinale
router.put('/employees/:id',
  preserveOriginalBody,
  auditMiddleware({ entityType: 'employees' }),
  employeeController.updateEmployee
);
```

---

## 🔒 Siguria

### **1. Akses i Kontrolluar**
- Vetëm adminët dhe menaxherët mund të shohin audit logs
- Autentikim i detyrueshëm për të gjitha operacionet
- Kontroll i role-ve për veprime të ndryshme

### **2. Mbrojtja e Të Dhënave**
- Audit logs nuk mund të fshihen nga përdoruesit e zakonshëm
- Retention policy automatik për logs të vjetër
- Backup automatik i audit logs

### **3. Detektimi i Intruzionit**
- Monitorim i login të dështuar
- Detektim i veprimeve të pazakonta
- Alerts për aktivitet të verdhësishëm

### **4. Compliance**
- GDPR compliance për audit trail
- Ruajtja e logs për periudha të caktuara
- Eksportim për audit të jashtëm

---

## 📊 Monitorimi

### **1. Dashboard Metrics**

Sistemi gjurmon:
- 📈 Numri i veprimeve në ditë
- 👥 Përdoruesit më aktivë
- 🏷️ Entitetet më të modifikuara
- ⚠️ Veprime të verdhësishme
- 🔍 Login të dështuar

### **2. Alerts dhe Notifikime**

```javascript
// Konfigurimi i alerts
const alerts = {
  failedLogins: { threshold: 5, period: '1h' },
  frequentDeletes: { threshold: 10, period: '24h' },
  nightActivity: { threshold: 20, period: '24h' },
  suspiciousIP: { enabled: true }
};
```

### **3. Raporte Periodike**

```bash
# Raport ditor
node scripts/audit-report.js daily

# Raport javor
node scripts/audit-report.js weekly

# Raport mujor
node scripts/audit-report.js monthly
```

### **4. Performance Monitoring**

```javascript
// Kontrollo performancën
const performance = {
  queryTime: '< 100ms',
  storageGrowth: '< 1GB/month',
  indexUsage: 'optimized',
  cleanupFrequency: 'daily'
};
```

---

## 🔧 Troubleshooting

### **Problemat e Zakonshme**

#### **1. "Audit logs janë të ngadaltë"**
```bash
# Kontrollo indekset
EXPLAIN ANALYZE SELECT * FROM audit_trail WHERE user_id = 123;

# Optimizo queries
CREATE INDEX CONCURRENTLY idx_audit_trail_user_timestamp 
ON audit_trail(user_id, timestamp);
```

#### **2. "Disk space po plotësohet"**
```bash
# Kontrollo madhësinë e tabelës
SELECT pg_size_pretty(pg_total_relation_size('audit_trail'));

# Pastro logs të vjetër
node scripts/audit-cleanup.js --days=90
```

#### **3. "Audit middleware nuk punon"**
```javascript
// Kontrollo konfigurimin
const auditConfig = {
  enabled: true,
  logLevel: 'info',
  skipPaths: ['/health', '/metrics'],
  maxBodySize: '1mb'
};
```

#### **4. "Gabime në detektimin e aktivitetit të verdhësishëm"**
```javascript
// Kontrollo thresholds
const suspiciousConfig = {
  failedLogins: { threshold: 5, window: '1h' },
  frequentDeletes: { threshold: 10, window: '24h' },
  nightActivity: { threshold: 20, window: '24h' }
};
```

### **Logs dhe Debugging**

```bash
# Kontrollo audit logs
tail -f logs/audit.log

# Debug mode
DEBUG=audit:* node app.js

# Test audit service
node scripts/test-audit.js
```

---

## 📈 Best Practices

### **1. Konfigurimi Optimal**

```javascript
// Konfigurimi i rekomanduar
const auditConfig = {
  retention: {
    days: 365,
    autoCleanup: true,
    archiveOld: true
  },
  performance: {
    batchSize: 100,
    flushInterval: 5000,
    maxQueueSize: 1000
  },
  security: {
    maskSensitiveData: true,
    encryptLogs: false,
    restrictAccess: true
  }
};
```

### **2. Monitoring i Vazhdueshëm**

```javascript
// Health checks
const healthChecks = {
  database: 'audit_trail accessible',
  middleware: 'audit middleware active',
  storage: 'sufficient disk space',
  performance: 'query response time < 100ms'
};
```

### **3. Backup dhe Recovery**

```bash
# Backup audit logs
pg_dump -t audit_trail database_name > audit_backup.sql

# Restore audit logs
psql database_name < audit_backup.sql
```

### **4. Compliance dhe Legal**

- Ruaj audit logs për minimum 1 vit
- Dokumento procedurat e audit
- Testo restore procedures çdo muaj
- Review audit reports çdo javë

---

## 🆘 Support

### **Kontakte**
- 📧 Email: admin@example.com
- 📱 Slack: #audit-support
- 📋 Jira: AUDIT-*

### **Dokumentacion i Shtesë**
- [PostgreSQL JSONB Guide](https://www.postgresql.org/docs/current/datatype-json.html)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)

---

## 📝 Changelog

### **v1.0.0 (2024-01-15)**
- ✅ Audit trail automatik për të gjitha veprimet
- ✅ Middleware për audit të avancuar
- ✅ Detektim i aktivitetit të verdhësishëm
- ✅ UI për menaxhim dhe raportim
- ✅ Eksportim në CSV
- ✅ Statistika dhe grafikë
- ✅ Retention policy automatik

---

**🎉 Sistemi i Audit Trail është gati për përdorim!** 
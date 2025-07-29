# 🚨 Real-Time Alerts - Udhëzues i Plotë

## 📋 Përmbajtja

1. [Përmbledhje](#përmbledhje)
2. [Funksionalitete](#funksionalitete)
3. [Instalimi dhe Konfigurimi](#instalimi-dhe-konfigurimi)
4. [Përdorimi](#përdorimi)
5. [API Endpoints](#api-endpoints)
6. [Alert Rules](#alert-rules)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Përmbledhje

Sistemi i Real-Time Alerts është një zgjidhje e avancuar për monitorimin dhe dërgimin e alerts në kohë reale për aktivitet të verdhësishëm në sistemin e ndërtimit. Ai ofron:

- ✅ **Monitorim automatik** i aktivitetit të verdhësishëm
- ✅ **Alerts në kohë reale** për adminët dhe menaxherët
- ✅ **Konfigurim fleksibël** i rules dhe thresholds
- ✅ **Detektim i anomaliteteve** të avancuar
- ✅ **Menaxhim i IP-ve** të verdhësishëm
- ✅ **Statistika dhe raportim** të detajuar

---

## 🚀 Funksionalitete

### **1. Monitorim Automatik**
- **Kontroll i vazhdueshëm** çdo 30 sekonda
- **Detektim i aktivitetit të verdhësishëm**
- **Analizë e anomaliteteve**
- **Monitorim i ngjarjeve të sigurisë**

### **2. Llojet e Alerts**
- **Login të dështuar** - Tentativa të shpeshta
- **Veprime të shpeshta** - Aktivitet i pazakontë
- **Aktivitet në natë** - Veprime në orët e pazakonta
- **Veprime kritike** - Ndryshime të rëndësishme
- **Ndryshime të shpejta** - Aktivitet i intensiv
- **Akses i paautorizuar** - IP të verdhësishëm
- **Eksportim të të dhënave** - Aktivitet i verdhësishëm
- **Operacione backup** - Veprime kritike
- **Ndryshime privilegjesh** - Modifikime të rëndësishme

### **3. Konfigurim Fleksibël**
- **Thresholds të personalizuara** për çdo lloj alert
- **Periudha të konfigurueshme** për monitorim
- **Rules të avancuara** për detektim
- **IP të verdhësishëm** të menaxhueshëm

### **4. Notifikime të Avancuara**
- **Real-time notifications** për adminët dhe menaxherët
- **Prioritet të ndryshëm** për alerts
- **Detaje të plota** për çdo alert
- **Historik i alerts** për analizë

---

## ⚙️ Instalimi dhe Konfigurimi

### **1. Konfigurimi Automatik**

Sistemi fillon automatikisht kur serveri startohet:

```javascript
// Në app.js
const RealTimeAlertService = require('./services/realTimeAlertService');
const realTimeAlertService = new RealTimeAlertService();

// Fillo monitoring pas 5 sekondash
setTimeout(async () => {
  await realTimeAlertService.startMonitoring();
}, 5000);
```

### **2. Konfigurimi i Environment**

Shtoni në `.env`:
```env
# Real-Time Alerts settings
REAL_TIME_MONITORING_ENABLED=true
ALERT_CHECK_INTERVAL=30000
ALERT_RETENTION_DAYS=30
SUSPICIOUS_ACTIVITY_ENABLED=true
```

### **3. Thresholds Default**

```javascript
const defaultThresholds = {
  failedLogins: { count: 5, window: 60 * 60 * 1000 }, // 5 login të dështuar në 1 orë
  frequentDeletes: { count: 10, window: 24 * 60 * 60 * 1000 }, // 10 fshirje në 24 orë
  nightActivity: { count: 20, window: 24 * 60 * 60 * 1000 }, // 20 veprime në natë në 24 orë
  suspiciousIP: { enabled: true },
  highSeverityEvents: { count: 3, window: 60 * 60 * 1000 }, // 3 veprime kritike në 1 orë
  rapidChanges: { count: 50, window: 60 * 60 * 1000 }, // 50 ndryshime në 1 orë
  unauthorizedAccess: { enabled: true },
  dataExport: { enabled: true },
  backupOperations: { enabled: true },
  userPrivilegeChanges: { enabled: true }
};
```

---

## 🎮 Përdorimi

### **1. Përmes UI (Frontend)**

#### **Kontrolli i Monitoring:**
1. Shko në **Admin Dashboard** → **🚨 Real-Time Alerts**
2. Kliko **▶️ Fillo Monitoring** për të aktivizuar
3. Kliko **⏹️ Ndalo Monitoring** për të ndaluar
4. Kliko **🧪 Test Alert** për të testuar sistemin

#### **Konfigurimi i Rules:**
1. Kliko **⚙️ Konfiguro** në seksionin Alert Rules
2. Përditëso thresholds për çdo lloj alert
3. Aktivizo/Deaktivizo rules specifike
4. Ruaj ndryshimet

#### **Menaxhimi i IP-ve të Verdësishëm:**
1. Kliko **🌐 Shto IP** në seksionin IP të Verdësishëm
2. Shto IP address dhe arsyen
3. Shiko listën e IP-ve të verdhësishëm
4. Hiq IP nëse nevojiten

### **2. Përmes API**

#### **Kontrolli i Monitoring:**
```bash
# Fillo monitoring
curl -X POST "http://localhost:5000/api/real-time-alerts/start" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ndalo monitoring
curl -X POST "http://localhost:5000/api/real-time-alerts/stop" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Merr statusin
curl -X GET "http://localhost:5000/api/real-time-alerts/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Test Alert:**
```bash
# Dërgo test alert
curl -X POST "http://localhost:5000/api/real-time-alerts/test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertType": "TEST_ALERT"}'
```

#### **Konfigurimi i Rules:**
```bash
# Përditëso thresholds
curl -X PUT "http://localhost:5000/api/real-time-alerts/thresholds" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "thresholds": {
      "failedLogins": {"count": 3, "window": 3600000},
      "frequentDeletes": {"count": 5, "window": 86400000}
    }
  }'
```

### **3. Përmes Middleware**

```javascript
// Integrimi me audit trail
const { auditMiddleware } = require('../middleware/audit');

// Për routes specifike
router.post('/users', 
  auditMiddleware({ entityType: 'users' }),
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

### **Monitoring Control**

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/real-time-alerts/start` | Fillo monitoring | Admin |
| `POST` | `/api/real-time-alerts/stop` | Ndalo monitoring | Admin |
| `GET` | `/api/real-time-alerts/status` | Merr statusin | Admin/Manager |

### **Alert Management**

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/real-time-alerts/test` | Test alert | Admin |
| `GET` | `/api/real-time-alerts/recent` | Alerts të fundit | Admin/Manager |
| `GET` | `/api/real-time-alerts/stats` | Statistika alerts | Admin/Manager |
| `POST` | `/api/real-time-alerts/cleanup` | Pastro alerts të vjetër | Admin |

### **Configuration**

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| `PUT` | `/api/real-time-alerts/thresholds` | Përditëso thresholds | Admin |
| `GET` | `/api/real-time-alerts/thresholds` | Merr thresholds | Admin/Manager |
| `POST` | `/api/real-time-alerts/rules` | Konfiguro rules | Admin |
| `GET` | `/api/real-time-alerts/rules` | Merr rules | Admin/Manager |

### **IP Management**

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/real-time-alerts/suspicious-ip` | Shto IP të verdhësishëm | Admin |
| `DELETE` | `/api/real-time-alerts/suspicious-ip/:ip` | Hiq IP të verdhësishëm | Admin |

### **Response Format**

```json
{
  "success": true,
  "message": "Real-time monitoring u aktivizua me sukses",
  "data": {
    "isActive": true,
    "startedAt": "2024-01-15T10:30:00.000Z",
    "thresholds": {
      "failedLogins": { "count": 5, "window": 3600000 }
    },
    "suspiciousIPs": ["192.168.1.100"],
    "alertHistorySize": 15,
    "activeSessions": 3
  }
}
```

---

## ⚙️ Alert Rules

### **1. Failed Logins**
```javascript
{
  "failedLogins": {
    "count": 5,           // Numri i tentativave
    "window": 3600000     // Periudha në milisekonda (1 orë)
  }
}
```

### **2. Frequent Deletes**
```javascript
{
  "frequentDeletes": {
    "count": 10,          // Numri i fshirjeve
    "window": 86400000    // Periudha në milisekonda (24 orë)
  }
}
```

### **3. Night Activity**
```javascript
{
  "nightActivity": {
    "count": 20,          // Numri i veprimeve
    "window": 86400000    // Periudha në milisekonda (24 orë)
  }
}
```

### **4. High Severity Events**
```javascript
{
  "highSeverityEvents": {
    "count": 3,           // Numri i veprimeve kritike
    "window": 3600000     // Periudha në milisekonda (1 orë)
  }
}
```

### **5. Rapid Changes**
```javascript
{
  "rapidChanges": {
    "count": 50,          // Numri i ndryshimeve
    "window": 3600000     // Periudha në milisekonda (1 orë)
  }
}
```

### **6. Boolean Rules**
```javascript
{
  "suspiciousIP": { "enabled": true },
  "unauthorizedAccess": { "enabled": true },
  "dataExport": { "enabled": true },
  "backupOperations": { "enabled": true },
  "userPrivilegeChanges": { "enabled": true }
}
```

---

## 📊 Monitoring

### **1. Kontrolli i Vazhdueshëm**

Sistemi kontrollon çdo 30 sekonda:
- Aktivitet të verdhësishëm
- Anomalitete
- Ngjarje sigurie
- IP të verdhësishëm

### **2. Detektimi i Anomaliteteve**

```javascript
// Kontrollo login të dështuar
await checkFailedLogins();

// Kontrollo veprime të shpeshta
await checkFrequentOperations();

// Kontrollo aktivitet në natë
await checkNightActivity();

// Kontrollo veprime kritike
await checkHighSeverityEvents();

// Kontrollo ndryshime të shpejta
await checkRapidChanges();
```

### **3. Detektimi i Ngjarjeve të Sigurisë**

```javascript
// Kontrollo akses të paautorizuar
await checkUnauthorizedAccess();

// Kontrollo eksportim të të dhënave
await checkDataExport();

// Kontrollo operacione backup
await checkBackupOperations();

// Kontrollo ndryshime privilegjesh
await checkUserPrivilegeChanges();
```

### **4. Historiku i Alerts**

```javascript
// Ruaj historikun për të shmangur spam
this.alertHistory = new Map();

// Kontrollo nëse kemi dërguar alert tashmë
if (this.alertHistory.has(alertKey)) {
  const lastAlert = this.alertHistory.get(alertKey);
  if (now - lastAlert < 60 * 60 * 1000) { // Mos dërgo alert për 1 orë
    return;
  }
}
```

---

## 🔧 Troubleshooting

### **Problemat e Zakonshme**

#### **1. "Monitoring nuk fillon"**
```bash
# Kontrollo logs
tail -f logs/app.log | grep "REAL-TIME"

# Kontrollo statusin
curl -X GET "http://localhost:5000/api/real-time-alerts/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **2. "Alerts nuk dërgohen"**
```javascript
// Kontrollo konfigurimin e notifications
const notificationConfig = {
  enabled: true,
  emailEnabled: true,
  pushEnabled: true,
  webhookEnabled: false
};
```

#### **3. "Thresholds nuk punojnë"**
```javascript
// Kontrollo formatimin e thresholds
const validThresholds = {
  failedLogins: { count: 5, window: 3600000 },
  frequentDeletes: { count: 10, window: 86400000 }
};
```

#### **4. "Performance issues"**
```javascript
// Optimizo intervalin e kontrollit
const monitoringInterval = 60000; // 1 minutë në vend të 30 sekondave

// Pastro historikun e vjetër
realTimeAlertService.cleanupOldHistory();
```

### **Logs dhe Debugging**

```bash
# Kontrollo real-time logs
tail -f logs/real-time-alerts.log

# Debug mode
DEBUG=real-time:* node app.js

# Test monitoring
node scripts/test-real-time-alerts.js
```

### **Monitoring i Performancës**

```javascript
// Kontrollo performancën
const performance = {
  checkInterval: '30 seconds',
  alertProcessing: '< 100ms',
  databaseQueries: '< 50ms',
  memoryUsage: '< 100MB'
};
```

---

## 📈 Best Practices

### **1. Konfigurimi Optimal**

```javascript
// Konfigurimi i rekomanduar
const optimalConfig = {
  monitoring: {
    interval: 30000,        // 30 sekonda
    enabled: true,
    autoStart: true
  },
  thresholds: {
    failedLogins: { count: 5, window: 3600000 },
    frequentDeletes: { count: 10, window: 86400000 },
    nightActivity: { count: 20, window: 86400000 },
    highSeverityEvents: { count: 3, window: 3600000 }
  },
  retention: {
    alertHistory: 24 * 60 * 60 * 1000,  // 1 ditë
    databaseLogs: 30 * 24 * 60 * 60 * 1000  // 30 ditë
  }
};
```

### **2. Monitoring i Vazhdueshëm**

```javascript
// Health checks
const healthChecks = {
  monitoring: 'real-time monitoring active',
  database: 'audit_trail accessible',
  notifications: 'notification service working',
  thresholds: 'alert rules configured'
};
```

### **3. Siguria**

```javascript
// Security measures
const securityMeasures = {
  accessControl: 'admin/manager only',
  rateLimiting: 'prevent spam alerts',
  dataValidation: 'validate all inputs',
  auditLogging: 'log all alert actions'
};
```

### **4. Performance**

```javascript
// Performance optimization
const performanceOptimization = {
  databaseIndexes: 'optimized for alert queries',
  caching: 'cache alert history',
  batchProcessing: 'process alerts in batches',
  cleanup: 'regular cleanup of old data'
};
```

---

## 🆘 Support

### **Kontakte**
- 📧 Email: admin@example.com
- 📱 Slack: #real-time-alerts
- 📋 Jira: RTALERT-*

### **Dokumentacion i Shtesë**
- [Audit Trail Guide](./AUDIT_TRAIL_GUIDE.md)
- [Notification System Guide](./NOTIFICATION_SYSTEM_GUIDE.md)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)

---

## 📝 Changelog

### **v1.0.0 (2024-01-15)**
- ✅ Real-time monitoring automatik
- ✅ Alert rules të konfigurueshme
- ✅ Detektim i anomaliteteve
- ✅ Menaxhim i IP-ve të verdhësishëm
- ✅ UI për menaxhim dhe konfigurim
- ✅ API endpoints të plota
- ✅ Integrim me notification system
- ✅ Statistika dhe raportim

---

**🎉 Sistemi i Real-Time Alerts është gati për përdorim!** 
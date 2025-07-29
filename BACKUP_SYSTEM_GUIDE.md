# 💾 Sistemi i Backup & Restore - Udhëzues i Plotë

## 📋 Përmbajtja

1. [Përmbledhje](#përmbledhje)
2. [Funksionalitete](#funksionalitete)
3. [Instalimi dhe Konfigurimi](#instalimi-dhe-konfigurimi)
4. [Përdorimi](#përdorimi)
5. [API Endpoints](#api-endpoints)
6. [Backup Automatik](#backup-automatik)
7. [Siguria](#siguria)
8. [Troubleshooting](#troubleshooting)
9. [Monitorimi](#monitorimi)

---

## 🎯 Përmbledhje

Sistemi i Backup & Restore është një zgjidhje e plotë për sigurinë e të dhënave në sistemin e ndërtimit. Ai ofron:

- ✅ **Backup të plotë** të databazës
- ✅ **Backup të pjesshëm** për tabela specifike
- ✅ **Restore automatik** me verifikim
- ✅ **Menaxhim të avancuar** të backup-ve
- ✅ **Notifikime në kohë reale** për adminët
- ✅ **Retention policy** automatik
- ✅ **Monitoring dhe raportim**

---

## 🚀 Funksionalitete

### **1. Backup i Plotë**
- Krijon backup të plotë të databazës
- Përfshin të gjitha tabelat dhe të dhënat
- Ruaj metadata për çdo backup
- Kompresim automatik

### **2. Backup i Pjesshëm**
- Backup vetëm për tabela të zgjedhura
- Ideal për tabela kritike
- Kontroll më i mirë mbi madhësinë

### **3. Restore i Sigurt**
- Verifikim para restore
- Konfirmim nga admini
- Backup automatik para restore
- Rollback në rast gabimi

### **4. Menaxhim i Avancuar**
- Lista e të gjitha backup-ve
- Informacion detajor për çdo backup
- Shkarkim direkt nga UI
- Fshirje e sigurt

### **5. Notifikime**
- Njoftime në kohë reale
- Email alerts për adminët
- Status updates automatik
- Alert për backup të dështuar

---

## ⚙️ Instalimi dhe Konfigurimi

### **1. Dependencat e Nevojshme**

Sigurohuni që keni instaluar:
```bash
# PostgreSQL client tools
sudo apt-get install postgresql-client  # Ubuntu/Debian
brew install postgresql                 # macOS
```

### **2. Konfigurimi i Environment**

Shtoni në `.env`:
```env
# Database
DATABASE_URL=your_database_connection_string

# Backup settings
BACKUP_RETENTION_DAYS=30
BACKUP_AUTO_CLEANUP=true
BACKUP_NOTIFICATION_EMAIL=admin@example.com
```

### **3. Direktoria e Backup-ve**

Sistemi krijon automatikisht:
```
backend/
├── backups/
│   ├── backup-full-2024-01-15T10-30-00.sql
│   ├── backup-full-2024-01-15T10-30-00.json
│   ├── backup-partial-2024-01-15T11-00-00.sql
│   └── backup-partial-2024-01-15T11-00-00.json
```

---

## 🎮 Përdorimi

### **1. Përmes UI (Frontend)**

#### **Krijo Backup të Plotë:**
1. Shko në **Admin Dashboard** → **💾 Backup**
2. Kliko **🔄 Krijo Backup të Plotë**
3. Shto përshkrim (opsional)
4. Kliko **Krijo**

#### **Krijo Backup të Pjesshëm:**
1. Kliko **📋 Krijo Backup të Pjesshëm**
2. Zgjidh tabelat e dëshiruara
3. Shto përshkrim
4. Kliko **Krijo Backup**

#### **Restore Backup:**
1. Gjej backup-in në listë
2. Kliko **🔄 Restore**
3. Konfirmo veprimin
4. Prisni përfundimin

### **2. Përmes API**

#### **Backup i Plotë:**
```bash
curl -X POST http://localhost:5000/api/backup/full \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Backup manual"}'
```

#### **Backup i Pjesshëm:**
```bash
curl -X POST http://localhost:5000/api/backup/partial \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tables": ["users", "employees", "contracts"],
    "description": "Backup tabelave kritike"
  }'
```

#### **Restore:**
```bash
curl -X POST http://localhost:5000/api/backup/restore/backup-full-2024-01-15T10-30-00.sql \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **3. Përmes Command Line**

#### **Backup Automatik:**
```bash
# Backup i plotë
node backend/scripts/backupScheduler.js full

# Backup i tabelave kritike
node backend/scripts/backupScheduler.js critical

# Verifiko backup-ve
node backend/scripts/backupScheduler.js verify

# Gjenero raport
node backend/scripts/backupScheduler.js report
```

---

## 🔌 API Endpoints

### **Backup Operations**

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/backup/full` | Krijo backup të plotë | Admin |
| `POST` | `/api/backup/partial` | Krijo backup të pjesshëm | Admin |
| `POST` | `/api/backup/restore/:filename` | Restore backup | Admin |
| `GET` | `/api/backup/list` | Listo backup-ve | Admin/Manager |
| `DELETE` | `/api/backup/:filename` | Fshi backup | Admin |
| `POST` | `/api/backup/cleanup` | Pastro backup të vjetër | Admin |

### **Monitoring**

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/backup/status` | Statusi i databazës | Admin/Manager |
| `GET` | `/api/backup/tables` | Informacion për tabelat | Admin/Manager |
| `GET` | `/api/backup/download/:filename` | Shkarko backup | Admin/Manager |

### **Response Format**

```json
{
  "success": true,
  "message": "Backup u krijua me sukses",
  "data": {
    "filename": "backup-full-2024-01-15T10-30-00.sql",
    "metadata": {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "description": "Backup manual",
      "type": "full",
      "size": 1048576,
      "tables": [...]
    }
  }
}
```

---

## 🤖 Backup Automatik

### **1. Cron Job Setup**

Shtoni në crontab:
```bash
# Backup ditor në 02:00
0 2 * * * cd /path/to/building-system && node backend/scripts/backupScheduler.js full

# Verifikim çdo 6 orë
0 */6 * * * cd /path/to/building-system && node backend/scripts/backupScheduler.js verify

# Backup i tabelave kritike çdo 12 orë
0 */12 * * * cd /path/to/building-system && node backend/scripts/backupScheduler.js critical
```

### **2. Monitoring Script**

```bash
#!/bin/bash
# backup-monitor.sh

cd /path/to/building-system

# Kontrollo backup të fundit
node backend/scripts/backupScheduler.js verify

# Gjenero raport
node backend/scripts/backupScheduler.js report

# Dërgo raport në email (opsional)
# mail -s "Backup Report" admin@example.com < backup-report.txt
```

### **3. Alert System**

Sistemi dërgon automatikisht:
- ✅ Njoftime për backup të suksesshëm
- ❌ Alerts për backup të dështuar
- ⚠️ Warnings për backup të vjetër
- 📊 Raporte periodike

---

## 🔒 Siguria

### **1. Akses i Kontrolluar**
- Vetëm adminët mund të krijojnë/restore backup
- Managerët mund të shohin dhe shkarkojnë
- Autentikim i detyrueshëm për të gjitha operacionet

### **2. Verifikimi i Backup-ve**
- Kontroll i integritetit të file-ve
- Verifikim i madhësisë dhe metadata
- Test restore në environment të veçantë

### **3. Enkriptimi (Opsional)**
```bash
# Enkripto backup
gpg --encrypt --recipient admin@example.com backup-file.sql

# Dekripto backup
gpg --decrypt backup-file.sql.gpg > backup-file.sql
```

### **4. Backup të Sigurt**
- Backup në lokacione të ndryshme
- Sync me cloud storage
- Redundancy për backup kritik

---

## 🔧 Troubleshooting

### **Problemat e Zakonshme**

#### **1. "pg_dump command not found"**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql

# Windows
# Instalo PostgreSQL nga website zyrtar
```

#### **2. "Permission denied"**
```bash
# Kontrollo permissions
chmod 755 backend/backups/
chmod 644 backend/backups/*.sql

# Kontrollo database permissions
GRANT CONNECT ON DATABASE your_db TO your_user;
GRANT USAGE ON SCHEMA public TO your_user;
```

#### **3. "Backup file corrupted"**
```bash
# Verifiko integritetin
pg_restore --list backup-file.sql

# Test restore në database të ri
createdb test_restore
psql test_restore < backup-file.sql
```

#### **4. "Disk space full"**
```bash
# Kontrollo hapësirën
df -h

# Pastro backup të vjetër
node backend/scripts/backupScheduler.js cleanup

# Ose manual
find backend/backups/ -name "*.sql" -mtime +30 -delete
```

### **Logs dhe Debugging**

```bash
# Kontrollo logs
tail -f backend/logs/backup.log

# Debug mode
DEBUG=backup:* node backend/scripts/backupScheduler.js full

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

---

## 📊 Monitorimi

### **1. Dashboard Metrics**

Sistemi gjurmon:
- 📈 Numri i backup-ve
- 📊 Madhësia totale
- ⏰ Koha e fundit e backup
- 🔄 Statusi i restore
- ⚠️ Alerts dhe warnings

### **2. Health Checks**

```bash
# Kontrollo statusin
curl http://localhost:5000/api/backup/status

# Verifiko backup të fundit
node backend/scripts/backupScheduler.js verify

# Gjenero raport
node backend/scripts/backupScheduler.js report
```

### **3. Alerting**

Konfiguroni alerts për:
- Backup i dështuar
- Disk space i ulët
- Backup i vjetër (>24h)
- Restore i dështuar

### **4. Performance Monitoring**

```bash
# Kontrollo kohën e backup
time node backend/scripts/backupScheduler.js full

# Monitoro CPU/Memory
htop
iotop
```

---

## 📈 Best Practices

### **1. Strategjia e Backup**
- **Backup i plotë**: Çdo ditë në 02:00
- **Backup i pjesshëm**: Çdo 12 orë për tabela kritike
- **Verifikim**: Çdo 6 orë
- **Retention**: 30 ditë për backup të plotë, 7 ditë për të pjesshëm

### **2. Testimi**
- Test restore çdo javë
- Verifiko integritetin e backup-ve
- Simulo disaster recovery

### **3. Dokumentimi**
- Dokumento çdo restore
- Ruaj log-et e backup-ve
- Përditëso procedurat

### **4. Siguria**
- Enkripto backup kritik
- Ruaj në lokacione të ndryshme
- Kontrollo permissions

---

## 🆘 Support

### **Kontakte**
- 📧 Email: admin@example.com
- 📱 Slack: #backup-support
- 📋 Jira: BACKUP-*

### **Dokumentacion i Shtesë**
- [PostgreSQL Backup Guide](https://www.postgresql.org/docs/current/backup.html)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Cron Job Guide](https://crontab.guru/)

---

## 📝 Changelog

### **v1.0.0 (2024-01-15)**
- ✅ Backup i plotë dhe i pjesshëm
- ✅ Restore me verifikim
- ✅ UI për menaxhim
- ✅ Notifikime automatik
- ✅ Retention policy
- ✅ Monitoring dhe raportim

---

**🎉 Sistemi i Backup & Restore është gati për përdorim!** 
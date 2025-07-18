# Sistemi i Njoftimeve - Udhëzues i Plotë

## Përmbledhje

Sistemi i njoftimeve i Alban Construction është një zgjidhje e plotë për menaxhimin e komunikimit me përdoruesit. Sistemi përfshin njoftime në kohë reale, email notifications, dhe një ndërfaqe të përshtatshme për menaxhimin e preferencave.

## Funksionalitetet Kryesore

### 1. **Njoftimet në Kohë Reale**
- **Server-Sent Events (SSE)** për njoftime të menjëhershme
- **Toast notifications** që shfaqen automatikisht
- **Real-time updates** pa nevojë për refresh

### 2. **Email Notifications**
- **Automatike** për të gjitha veprimet e rëndësishme
- **Templates të personalizuara** me dizajn modern
- **Konfigurim i fleksibël** për lloje të ndryshme njoftimesh

### 3. **Menaxhimi i Njoftimeve**
- **Filtro dhe kërko** njoftimet
- **Bulk operations** (shëno të gjitha si të lexuara, fshi të zgjedhurat)
- **Eksportim** në CSV dhe PDF
- **Statistika** në kohë reale

### 4. **Konfigurimi i Preferencave**
- **Kanalet e njoftimeve** (email, push)
- **Llojet e njoftimeve** (kontratat, pagesat, detyrat, etj.)
- **Orët e qetësisë** për të shmangur ndërprerjet

## Struktura e Kodit

### Frontend Components

#### `NotificationBell.jsx`
```javascript
// Komponenti kryesor për shfaqjen e njoftimeve
- Real-time notifications me SSE
- Toast notifications
- Dropdown me listën e njoftimeve
- Navigim automatik bazuar në tipin e njoftimit
```

#### `NotificationsPage.jsx`
```javascript
// Faqja e plotë për menaxhimin e njoftimeve
- Filtro dhe kërko
- Bulk operations
- Eksportim CSV/PDF
- Statistikat
```

#### `NotificationSettings.jsx`
```javascript
// Konfigurimi i preferencave
- Kanalet e njoftimeve
- Llojet e njoftimeve
- Orët e qetësisë
```

### Backend Services

#### `NotificationService.js`
```javascript
// Shërbimi kryesor për njoftimet
- createNotification() - Krijo njoftim të ri
- sendEmailNotification() - Dërgo email
- sendRealTimeNotification() - Dërgo në kohë reale
- getUserNotifications() - Merr njoftimet e përdoruesit
```

#### `notificationController.js`
```javascript
// Kontrolleri për API endpoints
- getNotifications() - Merr të gjitha njoftimet
- getNotificationStream() - SSE endpoint
- markAsRead() - Shëno si të lexuar
- getNotificationSettings() - Merr konfigurimin
```

## API Endpoints

### Njoftimet
```
GET    /api/notifications           - Merr të gjitha njoftimet
GET    /api/notifications/stream    - Real-time stream
PATCH  /api/notifications/:id/read  - Shëno si të lexuar
PATCH  /api/notifications/mark-all-read - Shëno të gjitha
DELETE /api/notifications/:id       - Fshi njoftimin
POST   /api/notifications/test-email - Test email
POST   /api/notifications/send-manual - Dërgo manual
```

### Konfigurimi
```
GET    /api/notifications/settings  - Merr konfigurimin
PUT    /api/notifications/settings  - Ruaj konfigurimin
```

## Llojet e Njoftimeve

### 1. **Kontratat**
- `contract_assigned` - Kontratë e re e caktuar
- `contract_updated` - Kontratë e përditësuar
- `contract_completed` - Kontratë e përfunduar

### 2. **Pagesat**
- `payment_received` - Pagesë e re e marrë
- `payment_due` - Pagesë që duhet bërë
- `payment_overdue` - Pagesë e vonuar

### 3. **Detyrat**
- `task_assigned` - Detyrë e re e caktuar
- `task_completed` - Detyrë e përfunduar
- `task_overdue` - Detyrë e vonuar

### 4. **Kujtues**
- `work_hours_reminder` - Kujtues për orët e punës
- `invoice_reminder` - Kujtues për faturat
- `expense_reminder` - Kujtues për shpenzimet

## Konfigurimi i Email

### Resend Setup
```javascript
const resend = new Resend(process.env.RESEND_API_KEY);
```

### Email Template
```html
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h1>🏗️ Alban Construction</h1>
  <div class="notification-content">
    <h2>📢 Ju keni një njoftim të ri!</h2>
    <p><strong>Titulli:</strong> {{title}}</p>
    <p><strong>Mesazhi:</strong> {{message}}</p>
  </div>
  <a href="{{link}}" class="button">🔗 Kliko këtu</a>
</div>
```

## Real-time Notifications

### Server-Sent Events
```javascript
// Frontend
const eventSource = new EventSource('/api/notifications/stream?userId=${user.id}');
eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // Përditëso UI
};

// Backend
res.write(`data: ${JSON.stringify(notification)}\n\n`);
```

### Toast Notifications
```javascript
// Shfaq toast notification
setNewNotification(notification);
setShowNewNotification(true);

// Fshi pas 5 sekondash
setTimeout(() => {
  setShowNewNotification(false);
}, 5000);
```

## Eksportimi i Të Dhënave

### CSV Export
```javascript
const csvContent = [
  headers.join(','),
  ...notifications.map(n => [
    n.id, n.title, n.message, n.type, n.isRead
  ].join(','))
].join('\n');
```

### PDF Export
```javascript
const { jsPDF } = await import('jspdf');
const doc = new jsPDF();
doc.html(htmlContent, {
  callback: (doc) => doc.save('njoftimet.pdf')
});
```

## Orët e Qetësisë

### Konfigurimi
```javascript
quietHours: {
  enabled: true,
  start: '22:00',
  end: '08:00'
}
```

### Kontrolli
```javascript
const isQuietHours = () => {
  const now = new Date();
  const currentTime = now.getHours() + ':' + now.getMinutes();
  return currentTime >= settings.quietHours.start || 
         currentTime <= settings.quietHours.end;
};
```

## Testimi

### Test Notifications
```bash
# Ekzekuto skriptin e testit
node backend/test_notifications.js

# Test email notification
curl -X POST /api/notifications/test-email \
  -H "Authorization: Bearer <token>"
```

### Manual Notification
```bash
curl -X POST /api/notifications/send-manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": 1,
    "title": "Test Notification",
    "message": "This is a test",
    "type": "info"
  }'
```

## Monitorimi dhe Logging

### Logs
```javascript
console.log(`Real-time notification sent to user ${userId}: ${notification.title}`);
console.log('Email notification sent successfully to:', user.email);
console.error('Error creating notification:', error);
```

### Statistikat
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
  COUNT(CASE WHEN is_read = true THEN 1 END) as read
FROM notifications 
WHERE user_id = $1
```

## Siguria

### Autentifikimi
```javascript
// Të gjitha endpoints kërkojnë token
router.use(verifyToken);

// Kontrollo që përdoruesi mund të aksesojë vetëm njoftimet e tij
const userId = req.user.id;
```

### Validimi
```javascript
if (!userId || !title || !message) {
  return res.status(400).json({ 
    error: 'userId, title dhe message janë të detyrueshme' 
  });
}
```

## Performanca

### Optimizimet
- **Polling** çdo 30 sekonda për fallback
- **SSE** për real-time updates
- **Indexes** në databazë për queries të shpejta
- **Lazy loading** për njoftimet e vjetra

### Caching
```javascript
// Cache njoftimet në frontend
const [notifications, setNotifications] = useState([]);

// Update cache kur vjen njoftim i ri
setNotifications(prev => [notification, ...prev]);
```

## Troubleshooting

### Probleme të Zakonshme

#### 1. Email nuk dërgohet
```javascript
// Kontrollo RESEND_API_KEY
console.log('Resend API Key:', process.env.RESEND_API_KEY);

// Kontrollo email-in e përdoruesit
const user = await getUser(userId);
if (!user.email) {
  console.log('User has no email address');
  return;
}
```

#### 2. Real-time notifications nuk punojnë
```javascript
// Kontrollo SSE connection
eventSource.onerror = (error) => {
  console.error('EventSource error:', error);
  // Fallback në polling
};
```

#### 3. Njoftimet nuk shfaqen
```javascript
// Kontrollo user authentication
if (!user) {
  return null; // Mos shfaq asgjë
}

// Kontrollo notification settings
if (!settings.pushNotifications) {
  return; // Mos dërgo push notification
}
```

## Përmirësimet e Ardhshme

### 1. **Push Notifications në Browser**
- Implemento Service Workers
- Shto browser notifications
- Përmirëso user experience

### 2. **Mobile App Integration**
- Firebase Cloud Messaging
- Push notifications në mobile
- Sync me web app

### 3. **Advanced Filtering**
- Filter by date range
- Filter by priority
- Search in message content

### 4. **Analytics**
- Track notification engagement
- A/B testing për templates
- Performance metrics

### 5. **Automation**
- Scheduled notifications
- Conditional notifications
- Workflow triggers

## Konkluzioni

Sistemi i njoftimeve i Alban Construction ofron një zgjidhje të plotë dhe të fleksibël për komunikimin me përdoruesit. Me funksionalitete të avancuara si real-time notifications, email integration, dhe konfigurim të personalizuar, sistemi përmbush të gjitha kërkesat moderne për menaxhimin e njoftimeve.

Për çdo pyetje ose problem, ju lutemi kontaktoni ekipin e zhvillimit.
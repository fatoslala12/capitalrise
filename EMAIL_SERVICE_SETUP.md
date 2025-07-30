# 📧 Email Service Setup - Alban Construction

## 🎯 Përmbledhje

Sistemi i email-ve u përmirësua për të përdorur **Resend API** në vend të SMTP tradicional. Kjo ofron:
- ✅ Deliverability më të mirë
- ✅ Setup më të thjeshtë
- ✅ Monitoring dhe analytics
- ✅ Email templates të bukura

## 🔧 Konfigurimi

### 1. **Variablat e Mjedisit (.env)**

Shto këto variabla në file-in `.env` në backend:

```env
# Email Configuration - Resend API
RESEND_API_KEY=your_resend_api_key_here
TEST_EMAIL=admin@albanconstruction.com

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 2. **Marrja e Resend API Key**

1. Shko në [resend.com](https://resend.com)
2. Krijo një llogari
3. Verifiko domain-in tuaj (ose përdor domain-in e Resend)
4. Kopjo API key nga dashboard

### 3. **Përdorimi i Domain-it të Resend**

Për të përdorur `onboarding@resend.dev` (domain-in e Resend):
- ✅ Nuk kërkon verifikim domain
- ✅ Funksionon menjëherë
- ✅ Përshtatet për testime

**Për domain-in tuaj në të ardhmen:**
1. Shto domain-in `albanconstruction.com` në Resend
2. Konfiguro DNS records sipas udhëzimeve
3. Prit verifikimin
4. Ndrysho `from` email në `EmailService.js`:
```javascript
from: 'Alban Construction <noreply@albanconstruction.com>'
```

## 📧 Funksionalitetet

### 1. **Welcome Email**
Kur krijohet një user i ri, sistemi dërgon automatikisht:

```
Përshëndetje [Emri],

Mirë se vini në Alban Construction!
Jemi të kënaqur që ju kemi pjesë të ekipit tonë.

Llogaria juaj në sistemin tonë është krijuar me sukses. 
Më poshtë gjeni të dhënat e hyrjes:

🔹 Email: [email]
🔹 Fjalëkalimi: [password]
🔹 Roli në sistem: [Roli]

🔐 Kujdes për sigurinë:
Për arsye sigurie, ju lutemi që të ndryshoni fjalëkalimin 
tuaj pas hyrjes së parë në sistem.

Nëse keni ndonjë pyetje ose nevojë për ndihmë, 
mos hezitoni të na kontaktoni.

Me respekt,
Ekipi i Alban Construction
```

### 2. **Password Reset Email**
Kur ndryshohet fjalëkalimi, dërgohet njoftim me siguri.

### 3. **Notification Emails**
Për ngjarje të rëndësishme dhe njoftime sistemi.

## 🧪 Testimi

### 1. **Test Email Service**
```bash
# Në backend directory
curl -X POST http://localhost:3000/api/user-management/test-email \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. **Kontrollo Status**
```bash
curl -X GET http://localhost:3000/api/user-management/email/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. **Krijo User Test**
1. Hyr si admin
2. Shko te "👷 Punonjësit"
3. Kliko "➕ Shto Punonjës"
4. Plotëso të dhënat me email të vërtetë
5. Kliko "Ruaj"
6. Kontrollo email-in

## 🔍 Troubleshooting

### Problemi: "Email service nuk është i disponueshëm"
**Zgjidhja:**
- Kontrollo nëse `RESEND_API_KEY` është shtuar në `.env`
- Restart server-in pas ndryshimit të `.env`

### Problemi: "API key invalid"
**Zgjidhja:**
- Kontrollo nëse API key është i saktë
- Verifiko nëse llogaria e Resend është aktive

### Problemi: "Domain not verified"
**Zgjidhja:**
- Përdor `onboarding@resend.dev` për test
- Ose verifiko domain-in tuaj në Resend

## 📊 Monitoring

### 1. **Resend Dashboard**
- Shko në [resend.com/dashboard](https://resend.com/dashboard)
- Shiko delivery stats
- Kontrollo bounce rates
- Monitoro performance

### 2. **Server Logs**
```bash
# Kontrollo logs për email events
tail -f backend/logs/app.log | grep "Email"
```

## 🚀 Deployment

### 1. **Vercel/Netlify**
Shto environment variables në dashboard:
- `RESEND_API_KEY`
- `TEST_EMAIL`
- `FRONTEND_URL`

### 2. **VPS/Dedicated Server**
```bash
# Shto në .env
RESEND_API_KEY=re_xxxxxxxxxxxx
TEST_EMAIL=admin@albanconstruction.com
FRONTEND_URL=https://yourdomain.com
```

## 📝 API Endpoints

### User Management
- `POST /api/user-management/create` - Krijo user me email
- `POST /api/user-management/reset-password` - Reset password me email
- `POST /api/user-management/test-email` - Test email service
- `GET /api/user-management/email/status` - Kontrollo status

### Auth
- `POST /api/auth/login` - Login me audit trail
- `POST /api/auth/forgot-password` - Forgot password

## 🔒 Siguria

### 1. **API Key Security**
- Mos commit API key në git
- Përdor environment variables
- Rrotullo API keys rregullisht

### 2. **Email Validation**
- Validizo email format
- Kontrollo nëse email ekziston
- Rate limiting për email sending

### 3. **Audit Trail**
- Të gjitha email events logohen
- Kontrollo audit trail për suspicious activity

## 📈 Performance

### 1. **Rate Limits**
- Resend: 100 emails/day (free), 10,000/month (paid)
- Implementuar rate limiting në backend

### 2. **Delivery Optimization**
- HTML + Text versions
- Responsive design
- Optimized images

### 3. **Monitoring**
- Delivery tracking
- Bounce handling
- Spam score monitoring

## 🎨 Customization

### 1. **Email Templates**
Ndrysho templates në `backend/services/emailService.js`:
- `generateWelcomeEmailHTML()`
- `generatePasswordResetHTML()`
- `generateNotificationHTML()`

### 2. **Branding**
- Ndrysho logo dhe colors
- Shto company branding
- Personalizo footer

### 3. **Localization**
- Shumë gjuhë
- Dynamic content
- Cultural adaptations

---

## ✅ Checklist Setup

- [ ] Krijo llogari në Resend
- [ ] Shto `RESEND_API_KEY` në `.env`
- [ ] Verifiko domain (opsional)
- [ ] Test email service
- [ ] Krijo user test
- [ ] Kontrollo delivery
- [ ] Konfiguro monitoring
- [ ] Dokumento setup

---

**📞 Support:** Nëse keni probleme, kontaktoni administratorin e sistemit. 
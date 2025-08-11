# 🔑 SETUP I API KEYS PËR EMAIL-E TË NDRYSHME

## 📋 **KONFIGURIMI I .ENV FILE:**

Shtoni këto variabla në file-in `backend/.env`:

```env
# Database Configuration
DATABASE_URL=your_database_url_here
JWT_SECRET=your_jwt_secret_here

# Resend Email Configuration - API Keys për secilin email
RESEND_API_KEY=re_your_main_api_key_here

# API Keys të veçanta për secilin email (opsionale)
RESEND_API_KEY_ADMIN=re_admin_api_key_here
RESEND_API_KEY_FLALA24=re_flala24_api_key_here
RESEND_API_KEY_ADI=re_adi_api_key_here
RESEND_API_KEY_FLALA22=re_flala22_api_key_here
RESEND_API_KEY_PELLUMB=re_pellumb_api_key_here
RESEND_API_KEY_DMYR=re_dmyr_api_key_here
RESEND_API_KEY_AUTO=re_auto_api_key_here
RESEND_API_KEY_RUDIN=re_rudin_api_key_here

# Other configurations
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
```

## 🚀 **HAPAT PËR TË KRIJUAR API KEYS:**

### **1. Krijo API Key për Admin:**
- Shko në [Resend.com Dashboard](https://resend.com/api-keys)
- Kliko "+ Create API Key"
- Emër: "Admin - fatoslala12@gmail.com"
- Permission: "Sending access"
- Kopjo API key-n dhe vendose në `RESEND_API_KEY_ADMIN`

### **2. Krijo API Key për Flala24:**
- Emër: "Flala24 - flala24@beder.edu.al"
- Permission: "Sending access"
- Vendose në `RESEND_API_KEY_FLALA24`

### **3. Krijo API Key për Adi:**
- Emër: "Adi - adi@albanconstruction.co.uk"
- Permission: "Sending access"
- Vendose në `RESEND_API_KEY_ADI`

### **4. Krijo API Key për Flala22:**
- Emër: "Flala22 - flala22@beder.edu.al"
- Permission: "Sending access"
- Vendose në `RESEND_API_KEY_FLALA22`

### **5. Krijo API Key për Pellumb:**
- Emër: "Pellumb - pellumblala10@gmail.com"
- Permission: "Sending access"
- Vendose në `RESEND_API_KEY_PELLUMB`

### **6. Krijo API Key për Dmyr:**
- Emër: "Dmyr - dmyrtollari97@gmail.com"
- Permission: "Sending access"
- Vendose në `RESEND_API_KEY_DMYR`

### **7. Krijo API Key për Auto:**
- Emër: "Auto - autobigbrotirane@gmail.com"
- Permission: "Sending access"
- Vendose në `RESEND_API_KEY_AUTO`

### **8. Krijo API Key për Rudin:**
- Emër: "Rudin - rudinislami1@gmail.com"
- Permission: "Sending access"
- Vendose në `RESEND_API_KEY_RUDIN`

## ✅ **PËRFITIMET:**

1. **Çdo email mund të dërgojë** në adresën e vet
2. **Më shumë fleksibilitet** në menaxhimin e email-eve
3. **Tracking më i mirë** për secilin përdorues
4. **Siguri më e lartë** - çdo API key ka akses të kufizuar

## 🔍 **TESTIMI:**

Pasi të konfiguroni API keys, mund t'i testoni me:

```javascript
// Testo API key për një email specifik
const result = await NotificationService.testApiKey('flala24@beder.edu.al');
console.log(result);

// Merr informacionin për të gjitha API keys
const apiKeysInfo = NotificationService.getAllApiKeysInfo();
console.log(apiKeysInfo);
```

## ⚠️ **KUJDES:**

- **Mos ndani API keys** me askënd
- **Përdorni vetëm për këtë aplikacion**
- **Ndryshoni API keys** nëse dyshon për sigurinë
- **Kontrolloni limitet** e Resend.com për çdo API key

# 📧 Udhëzime për Konfigurimin e Email-it

## Hapat për të aktivizuar dërgimin e faturëve dhe contract details në email:

### 1. **Krijo Resend Account:**

1. Shko në [Resend.com](https://resend.com)
2. Krijo një llogari të re (falas për 100 email/ditë)
3. Verifiko domain-in tuaj ose përdor domain-in e Resend
4. Kopjo API key-n nga dashboard

### 2. **Shto variablat në .env file:**

Krijo një file `.env` në direktorinë `backend/` me këto variabla:

```env
# Database
DATABASE_URL=your_database_url_here

# JWT
JWT_SECRET=your_jwt_secret_here

# Resend Email Configuration
RESEND_API_KEY=re_your_resend_api_key_here

# Other configurations
NODE_ENV=production
```

### 3. **Konfigurimi i Domain-it:**

Nëse keni domain tuaj:
1. Shtoni DNS records në domain provider
2. Verifikoni domain-in në Resend dashboard
3. Përdorni `noreply@yourdomain.com` si from address

Nëse nuk keni domain:
1. Përdorni domain-in e Resend: `onboarding@resend.dev`
2. Ose verifikoni një domain personal

### 4. **Testo funksionalitetin:**

1. Shto email-in e kompanisë në formën e kontratës
2. Kliko butonin "📧 Dërgo në Email" në header-in e kontratës
3. Kliko butonin "📧" në tabelën e faturëve
4. Kontrollo nëse email-i u dërgua

### 5. **Troubleshooting:**

- **Gabim "Invalid API key"**: Kontrollo Resend API key
- **Gabim "Domain not verified"**: Verifiko domain-in në Resend
- **Email nuk dërgohet**: Kontrollo internet connection dhe Resend settings

### 6. **Siguria:**

- Mos nda API key me askënd
- Përdor vetëm për këtë aplikacion
- Ndrysho API key nëse dyshon për sigurinë

### 7. **Limitet e Resend:**

- **Plan Falas**: 100 email/ditë
- **Plan Pro**: 50,000 email/muaj
- **Plan Business**: 500,000 email/muaj

### 8. **Përfitimet e Resend:**

- ✅ Nuk kërkon app passwords
- ✅ Setup i thjeshtë
- ✅ Deliverability e lartë
- ✅ Analytics dhe tracking
- ✅ API moderne
- ✅ Dokumentim i mirë 
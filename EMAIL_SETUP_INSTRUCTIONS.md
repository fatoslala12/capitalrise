# 📧 Udhëzime për Konfigurimin e Email-it

## Hapat për të aktivizuar dërgimin e faturëve në email:

### 1. **Krijo App Password për Gmail:**

1. Shko në [Google Account Settings](https://myaccount.google.com/)
2. Kliko "Security" në menunë e majtë
3. Në seksionin "Signing in to Google", kliko "2-Step Verification"
4. Në fund të faqes, kliko "App passwords"
5. Zgjidh "Mail" dhe "Other (Custom name)"
6. Jep një emër si "Building System"
7. Kliko "Generate"
8. Kopjo password-in e gjeneruar (16 karaktere)

### 2. **Shto variablat në .env file:**

Krijo një file `.env` në direktorinë `backend/` me këto variabla:

```env
# Database
DATABASE_URL=your_database_url_here

# JWT
JWT_SECRET=your_jwt_secret_here

# Gmail SMTP Configuration
GMAIL_APP_PASSWORD=your_16_character_app_password_here

# Other configurations
NODE_ENV=production
```

### 3. **Testo funksionalitetin:**

1. Shto email-in e kompanisë në formën e kontratës
2. Kliko butonin "📧" në tabelën e faturëve
3. Kontrollo nëse email-i u dërgua

### 4. **Troubleshooting:**

- **Gabim "Invalid login"**: Kontrollo App Password
- **Gabim "Authentication failed"**: Sigurohu që 2FA është aktivizuar
- **Email nuk dërgohet**: Kontrollo internet connection dhe Gmail settings

### 5. **Siguria:**

- Mos nda App Password me askënd
- Përdor vetëm për këtë aplikacion
- Ndrysho password-in nëse dyshon për sigurinë

### 6. **Limitet e Gmail:**

- Maksimum 500 email/ditë
- Maksimum 100 email/orë
- Rekomandohet përdorimi i SendGrid për vëllime të mëdha 
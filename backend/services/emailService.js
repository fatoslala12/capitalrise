const { Resend } = require('resend');
const { createError } = require('../middleware/errorHandler');

class EmailService {
  constructor() {
    this.resend = null;
    this.initializeResend();
  }

  // Initialize Resend
  async initializeResend() {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY nuk është konfiguruar');
        this.resend = null;
        return;
      }

      this.resend = new Resend(process.env.RESEND_API_KEY);
      console.log('✅ Resend email service u inicializua me sukses');
    } catch (error) {
      console.error('❌ Gabim në inicializimin e Resend service:', error);
      this.resend = null;
    }
  }

  // Dërgo email për user të ri
  async sendWelcomeEmail(userData) {
    try {
      if (!this.resend) {
        throw createError('EMAIL_SERVICE_ERROR', null, 'Email service nuk është i disponueshëm');
      }

      const { email, firstName, lastName, password, role } = userData;
      
      const subject = 'Mirëseerdhët në Alban Construction!';
      const htmlContent = this.generateWelcomeEmailHTML(userData);
      const textContent = this.generateWelcomeEmailText(userData);

      const result = await this.resend.emails.send({
        from: 'Alban Construction <onboarding@resend.dev>',
        to: [email],
        subject: subject,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Email u dërgua me sukses:', result.id);
      
      return {
        success: true,
        messageId: result.id,
        email: email
      };

    } catch (error) {
      console.error('❌ Gabim në dërgimin e email:', error);
      throw createError('EMAIL_SERVICE_ERROR', {
        email: userData.email,
        error: error.message
      }, 'Gabim në dërgimin e email-it të mirëseerdhjes');
    }
  }

  // Dërgo email për reset password
  async sendPasswordResetEmail(email, resetToken) {
    try {
      if (!this.resend) {
        throw createError('EMAIL_SERVICE_ERROR', null, 'Email service nuk është i disponueshëm');
      }

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      
      const subject = 'Reset Fjalëkalimi - Alban Construction';
      const htmlContent = this.generatePasswordResetHTML(email, resetUrl);
      const textContent = this.generatePasswordResetText(email, resetUrl);

      const result = await this.resend.emails.send({
        from: 'Alban Construction <onboarding@resend.dev>',
        to: [email],
        subject: subject,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Password reset email u dërgua me sukses:', result.id);
      
      return {
        success: true,
        messageId: result.id,
        email: email
      };

    } catch (error) {
      console.error('❌ Gabim në dërgimin e password reset email:', error);
      throw createError('EMAIL_SERVICE_ERROR', {
        email: email,
        error: error.message
      }, 'Gabim në dërgimin e email-it për reset password');
    }
  }

  // Dërgo email për notifikime të rëndësishme
  async sendNotificationEmail(email, subject, message, type = 'info') {
    try {
      if (!this.resend) {
        throw createError('EMAIL_SERVICE_ERROR', null, 'Email service nuk është i disponueshëm');
      }

      const htmlContent = this.generateNotificationHTML(subject, message, type);
      const textContent = this.generateNotificationText(subject, message, type);

      const result = await this.resend.emails.send({
        from: 'Alban Construction <onboarding@resend.dev>',
        to: [email],
        subject: subject,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Notification email u dërgua me sukses:', result.id);
      
      return {
        success: true,
        messageId: result.id,
        email: email
      };

    } catch (error) {
      console.error('❌ Gabim në dërgimin e notification email:', error);
      throw createError('EMAIL_SERVICE_ERROR', {
        email: email,
        error: error.message
      }, 'Gabim në dërgimin e email-it të njoftimit');
    }
  }

  // Generate HTML për welcome email
  generateWelcomeEmailHTML(userData) {
    const { firstName, lastName, email, password, role } = userData;
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    
    return `
      <!DOCTYPE html>
      <html lang="sq">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mirëseerdhët në Alban Construction</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border: 1px solid #e9ecef;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 25px;
            border-bottom: 3px solid #007bff;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 15px;
          }
          .welcome-text {
            font-size: 20px;
            color: #495057;
            margin-bottom: 25px;
          }
          .credentials-box {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #dee2e6;
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
          }
          .credential-item {
            margin: 15px 0;
            font-weight: 500;
            font-size: 16px;
          }
          .credential-label {
            color: #007bff;
            font-weight: bold;
            display: inline-block;
            width: 120px;
          }
          .login-button {
            display: inline-block;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            padding: 15px 35px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 25px 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
          }
          .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
          }
          .footer {
            text-align: center;
            margin-top: 35px;
            padding-top: 25px;
            border-top: 2px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
          }
          .warning {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            color: #856404;
          }
          .security-icon {
            font-size: 18px;
            margin-right: 8px;
          }
          .credentials-title {
            color: #007bff;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏗️ Alban Construction</div>
            <div class="welcome-text">Mirëseerdhët në sistemin tonë!</div>
          </div>
          
          <p>Përshëndetje <strong>${firstName} ${lastName}</strong>,</p>
          
          <p>Mirë se vini në Alban Construction!<br>
          Jemi të kënaqur që ju kemi pjesë të ekipit tonë.</p>
          
          <p>Llogaria juaj në sistemin tonë është krijuar me sukses. Më poshtë gjeni të dhënat e hyrjes:</p>
          
          <div class="credentials-box">
            <div class="credentials-title">🔐 Kredencialet e Hyrjes</div>
            <div class="credential-item">
              <span class="credential-label">🔹 Email:</span> ${email}
            </div>
            <div class="credential-item">
              <span class="credential-label">🔹 Fjalëkalimi:</span> ${password}
            </div>
            <div class="credential-item">
              <span class="credential-label">🔹 Roli në sistem:</span> ${this.getRoleLabel(role)}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="login-button">🚀 Hyr në Sistem</a>
          </div>
          
          <div class="warning">
            <strong><span class="security-icon">🔐</span>Kujdes për sigurinë:</strong><br>
            Për arsye sigurie, ju lutemi që të ndryshoni fjalëkalimin tuaj pas hyrjes së parë në sistem.
          </div>
          
          <p>Nëse keni ndonjë pyetje ose nevojë për ndihmë, mos hezitoni të na kontaktoni.</p>
          
          <div class="footer">
            <p><strong>Me respekt,</strong><br>
            <strong>Ekipi i Alban Construction</strong></p>
            <p style="margin-top: 20px; font-size: 12px; color: #adb5bd;">
              Ky email u dërgua automatikisht nga sistemi i Alban Construction.<br>
              Ju lutem mos përgjigjuni këtij email-i.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate text për welcome email
  generateWelcomeEmailText(userData) {
    const { firstName, lastName, email, password, role } = userData;
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    
    return `
Mirëseerdhët në Alban Construction!

Përshëndetje ${firstName} ${lastName},

Mirë se vini në Alban Construction!
Jemi të kënaqur që ju kemi pjesë të ekipit tonë.

Llogaria juaj në sistemin tonë është krijuar me sukses. Më poshtë gjeni të dhënat e hyrjes:

🔹 Email: ${email}
🔹 Fjalëkalimi: ${password}
🔹 Roli në sistem: ${this.getRoleLabel(role)}

🔐 Kujdes për sigurinë:
Për arsye sigurie, ju lutemi që të ndryshoni fjalëkalimin tuaj pas hyrjes së parë në sistem.

Link për hyrje: ${loginUrl}

Nëse keni ndonjë pyetje ose nevojë për ndihmë, mos hezitoni të na kontaktoni.

Me respekt,
Ekipi i Alban Construction

---
Ky email u dërgua automatikisht nga sistemi i Alban Construction.
Ju lutem mos përgjigjuni këtij email-i.
    `;
  }

  // Generate HTML për password reset
  generatePasswordResetHTML(email, resetUrl) {
    return `
      <!DOCTYPE html>
      <html lang="sq">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Fjalëkalimi - Alban Construction</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e3f2fd;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
          }
          .reset-button {
            display: inline-block;
            background-color: #1976d2;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
            transition: background-color 0.3s;
          }
          .reset-button:hover {
            background-color: #1565c0;
          }
          .warning {
            background-color: #fff3e0;
            border: 1px solid #ffcc02;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #e65100;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏗️ Alban Construction</div>
            <div>Reset Fjalëkalimi</div>
          </div>
          
          <p>Përshëndetje,</p>
          
          <p>Kemi marrë një kërkesë për të rivendosur fjalëkalimin tuaj për llogarinë: <strong>${email}</strong></p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">🔐 Rivendos Fjalëkalimin</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Siguria:</strong> Ky link është i vlefshëm vetëm për 1 orë. Nëse nuk keni bërë këtë kërkesë, ju lutem injoroni këtë email.
          </div>
          
          <p><strong>Link për reset:</strong> <a href="${resetUrl}">${resetUrl}</a></p>
          
          <div class="footer">
            <p>Ky email u dërgua automatikisht nga sistemi i Alban Construction.</p>
            <p>Ju lutem mos përgjigjuni këtij email-i.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate text për password reset
  generatePasswordResetText(email, resetUrl) {
    return `
Reset Fjalëkalimi - Alban Construction

Përshëndetje,

Kemi marrë një kërkesë për të rivendosur fjalëkalimin tuaj për llogarinë: ${email}

Link për reset: ${resetUrl}

⚠️ Siguria: Ky link është i vlefshëm vetëm për 1 orë. Nëse nuk keni bërë këtë kërkesë, ju lutem injoroni këtë email.

Ky email u dërgua automatikisht nga sistemi i Alban Construction.
Ju lutem mos përgjigjuni këtij email-i.
    `;
  }

  // Generate HTML për notifications
  generateNotificationHTML(subject, message, type) {
    const typeColors = {
      info: '#1976d2',
      success: '#2e7d32',
      warning: '#ed6c02',
      error: '#d32f2f'
    };
    
    const color = typeColors[type] || typeColors.info;
    
    return `
      <!DOCTYPE html>
      <html lang="sq">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${color};
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: ${color};
            margin-bottom: 10px;
          }
          .message {
            background-color: #f8f9fa;
            border-left: 4px solid ${color};
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏗️ Alban Construction</div>
            <div>${subject}</div>
          </div>
          
          <div class="message">
            ${message}
          </div>
          
          <div class="footer">
            <p>Ky email u dërgua automatikisht nga sistemi i Alban Construction.</p>
            <p>Ju lutem mos përgjigjuni këtij email-i.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate text për notifications
  generateNotificationText(subject, message, type) {
    return `
${subject} - Alban Construction

${message}

Ky email u dërgua automatikisht nga sistemi i Alban Construction.
Ju lutem mos përgjigjuni këtij email-i.
    `;
  }

  // Get role label
  getRoleLabel(role) {
    const roleLabels = {
      admin: 'Administrator',
      manager: 'Menaxher',
      employee: 'Punonjës',
      user: 'Përdorues'
    };
    return roleLabels[role] || role;
  }

  // Test email service
  async testEmailService() {
    try {
      if (!this.resend) {
        throw new Error('Resend service nuk është inicializuar');
      }

      const result = await this.resend.emails.send({
        from: 'Alban Construction <onboarding@resend.dev>',
        to: [process.env.TEST_EMAIL || 'admin@albanconstruction.com'],
        subject: 'Test Email - Alban Construction',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #007bff;">Test Email - Alban Construction</h1>
            <p>Ky është një test email për të verifikuar funksionimin e email service.</p>
            <p><strong>Koha e dërgimit:</strong> ${new Date().toLocaleString('sq-AL')}</p>
            <p><strong>Status:</strong> ✅ Email service funksionon normalisht</p>
          </div>
        `,
        text: 'Test Email - Alban Construction\n\nKy është një test email për të verifikuar funksionimin e email service.\n\nKoha e dërgimit: ' + new Date().toLocaleString('sq-AL') + '\nStatus: ✅ Email service funksionon normalisht'
      });
      
      console.log('✅ Test email u dërgua me sukses:', result.id);
      
      return {
        success: true,
        messageId: result.id,
        sentTo: process.env.TEST_EMAIL || 'admin@albanconstruction.com'
      };

    } catch (error) {
      console.error('❌ Gabim në test email:', error);
      throw error;
    }
  }

  // Dërgo faturë në email
  async sendInvoiceEmail(invoice, contract, recipientEmail, pdfBuffer = null) {
    try {
      if (!this.resend) {
        throw createError('EMAIL_SERVICE_ERROR', null, 'Email service nuk është i disponueshëm');
      }

      const subject = `Capital Rise Invoice #${invoice.invoice_number} for ${contract.company}`;
      const htmlContent = this.generateInvoiceEmailHTML(invoice, contract);
      const textContent = this.generateInvoiceEmailText(invoice, contract);

      const emailData = {
        from: 'Capital Rise <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      // Shto PDF attachment nëse është i disponueshëm
      if (pdfBuffer) {
        emailData.attachments = [{
          filename: `Invoice_${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }];
      }

      const result = await this.resend.emails.send(emailData);
      
      console.log('✅ Invoice email u dërgua me sukses:', result.id);
      
      return {
        success: true,
        messageId: result.id,
        email: recipientEmail
      };

    } catch (error) {
      console.error('❌ Gabim në dërgimin e invoice email:', error);
      throw createError('EMAIL_SERVICE_ERROR', {
        email: recipientEmail,
        error: error.message
      }, 'Gabim në dërgimin e email-it të faturës');
    }
  }

  // Dërgo contract details në email
  async sendContractDetailsEmail(contract, recipientEmail) {
    try {
      if (!this.resend) {
        throw createError('EMAIL_SERVICE_ERROR', null, 'Email service nuk është i disponueshëm');
      }

      const subject = `Detajet e Kontratës #${contract.contract_number} - ${contract.company}`;
      const htmlContent = this.generateContractDetailsEmailHTML(contract);
      const textContent = this.generateContractDetailsEmailText(contract);

      const result = await this.resend.emails.send({
        from: 'Alban Construction <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ Contract details email u dërgua me sukses:', result.id);
      
      return {
        success: true,
        messageId: result.id,
        email: recipientEmail
      };

    } catch (error) {
      console.error('❌ Gabim në dërgimin e contract details email:', error);
      throw createError('EMAIL_SERVICE_ERROR', {
        email: recipientEmail,
        error: error.message
      }, 'Gabim në dërgimin e email-it të detajeve të kontratës');
    }
  }

  // Generate HTML për invoice email
  generateInvoiceEmailHTML(invoice, contract) {
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('sq-AL', { 
        style: 'currency', 
        currency: 'GBP' 
      }).format(amount || 0);
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Invoice #${invoice.invoice_number}</title>
        <style>
          body {
            font-family: 'Segoe UI', sans-serif;
            font-size: 15px;
            margin: 0;
            background: #f4f6f8;
            padding: 40px;
            color: #333;
          }
          .email-wrapper {
            max-width: 760px;
            margin: 0 auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.06);
            padding: 30px;
          }
          .intro {
            margin-bottom: 30px;
          }
          .intro .brand {
            font-size: 24px;
            font-weight: bold;
            color: #cc6600;
            margin-bottom: 8px;
          }
          .intro p {
            font-size: 16px;
            line-height: 1.6;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
          }
          .title-block {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .title-block h1 {
            color: #cc6600;
            font-size: 28px;
            margin: 0;
          }
          .subtitle {
            font-size: 14px;
            color: #666;
            margin-top: 4px;
          }
          .company-info {
            text-align: right;
          }
          .company-info div {
            margin: 2px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
          }
          th {
            background: #d4f2dd;
            color: #333;
            padding: 10px;
            border: 1px solid #c0e6ca;
            text-align: left;
          }
          td {
            padding: 10px;
            border: 1px solid #eee;
          }
          .totals {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
          }
          .totals-table {
            width: 300px;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 8px;
            text-align: right;
          }
          .totals-table .label {
            text-align: left;
            color: #333;
          }
          .totals-table .grand-total {
            font-size: 18px;
            font-weight: bold;
            color: #cc6600;
          }
          .bank-details {
            margin-top: 40px;
            color: #333;
          }
          .bank-details h3 {
            color: #cc6600;
            margin-bottom: 10px;
          }
          .bank-details div {
            margin: 2px 0;
          }
          .qr-section {
            text-align: center;
            margin-top: 40px;
          }
          .qr-section img {
            border: 8px solid #f1f1f1;
            border-radius: 8px;
          }
          .pay-button {
            display: inline-block;
            background-color: #28a745;
            color: white;
            font-weight: bold;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 16px;
          }
          .thank-you {
            margin-top: 50px;
            text-align: center;
            font-weight: bold;
            color: #0a8340;
          }
        </style>
      </head>
      <body>

        <div class="email-wrapper">

          <div class="intro">
            <div class="brand">🏗️ Capital Rise</div>
            <p>
              Përshëndetje,<br><br>
              Ju dërgojmë më poshtë detajet e faturës të lëshuar për punimet e kryera në kuadër të kontratës:
              <strong>${contract.site_name || contract.company}</strong>.
            </p>
          </div>

          <div class="header">
            <div class="title-block">
              <img src="https://img.icons8.com/ios-filled/50/invoice.png" alt="Invoice Icon" width="32" />
              <div>
                <h1>INVOICE</h1>
                <div class="subtitle">Contract #${contract.contract_number} – ${contract.site_name || contract.company}</div>
              </div>
            </div>
            <div class="company-info">
              <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
              <div><strong>Client:</strong> ${contract.company}</div>
              <div><em>${contract.site_name || contract.company}</em></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Shifts</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map(item => `
                <tr>
                  <td>${item.description || ''}</td>
                  <td>${item.shifts || ''}</td>
                  <td>${formatCurrency(item.rate)}</td>
                  <td>${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table class="totals-table">
              <tr>
                <td class="label">Subtotal:</td>
                <td>${formatCurrency(invoice.total_net)}</td>
              </tr>
              <tr>
                <td class="label">VAT (20%):</td>
                <td>${formatCurrency(invoice.vat)}</td>
              </tr>
              <tr>
                <td class="label">Other:</td>
                <td>${formatCurrency(invoice.other)}</td>
              </tr>
              <tr>
                <td class="label grand-total">Total:</td>
                <td class="grand-total">${formatCurrency(invoice.total)}</td>
              </tr>
            </table>
          </div>

          <div class="bank-details">
            <h3>Capital Rise Ltd</h3>
            <div>HSBC Bank</div>
            <div>Account Number: 81845403</div>
            <div>Sort Code: 52474549</div>
            <div>Email: billing@capitalrise.al</div>
            <div>Phone: +355 XX XXX XXX</div>
            <div>Website: www.capitalrise.al</div>
          </div>

          <div class="qr-section">
            <p>Scan to pay:</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://your-payment-link.com/pay/${invoice.invoice_number}" alt="QR Code" />
            <br>
            <a class="pay-button" href="https://your-payment-link.com/pay/${invoice.invoice_number}" target="_blank">💳 Pay Now</a>
          </div>

          <div class="thank-you">
            THANK YOU FOR YOUR BUSINESS!
          </div>

        </div>

      </body>
      </html>
    `;
  }

  // Generate text për invoice email
  generateInvoiceEmailText(invoice, contract) {
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('sq-AL', { 
        style: 'currency', 
        currency: 'GBP' 
      }).format(amount || 0);
    };

    return `
Capital Rise Invoice #${invoice.invoice_number} for ${contract.company}

Përshëndetje,

Ju dërgojmë më poshtë detajet e faturës të lëshuar për punimet e kryera në kuadër të kontratës: ${contract.site_name || contract.company}.

INVOICE
Contract #${contract.contract_number} – ${contract.site_name || contract.company}

Date: ${formatDate(invoice.date)}
Client: ${contract.company}
Project: ${contract.site_name || contract.company}

Items:
${(invoice.items || []).map(item => `
- ${item.description || ''} | ${item.shifts || ''} shifts | ${formatCurrency(item.rate)} | ${formatCurrency(item.amount)}
`).join('')}

Totals:
- Subtotal: ${formatCurrency(invoice.total_net)}
- VAT (20%): ${formatCurrency(invoice.vat)}
- Other: ${formatCurrency(invoice.other)}
- Total: ${formatCurrency(invoice.total)}

Bank Details:
Capital Rise Ltd
HSBC Bank
Account Number: 81845403
Sort Code: 52474549
Email: billing@capitalrise.al
Phone: +355 XX XXX XXX
Website: www.capitalrise.al

THANK YOU FOR YOUR BUSINESS!
    `;
  }

  // Generate HTML për contract details email
  generateContractDetailsEmailHTML(contract) {
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Detajet e Kontratës #${contract.contract_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
          .contract-details { margin-bottom: 30px; }
          .contract-details h2 { color: #333; margin-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-item { padding: 15px; background: #f8f9fa; border-radius: 5px; }
          .info-label { font-weight: bold; color: #007bff; }
          .status-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
          .status-active { background: #d4edda; color: #155724; }
          .status-completed { background: #f8d7da; color: #721c24; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏗️ Alban Construction</div>
            <h1>Detajet e Kontratës #${contract.contract_number}</h1>
          </div>
          
          <div class="contract-details">
            <h2>Informacionet e Kontratës</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Kompania:</div>
                <div>${contract.company}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Kontrata #:</div>
                <div>${contract.contract_number}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Vendodhja:</div>
                <div>${contract.site_name || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Adresa:</div>
                <div>${contract.address || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data e Fillimit:</div>
                <div>${formatDate(contract.start_date)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data e Mbarimit:</div>
                <div>${formatDate(contract.finish_date)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Statusi:</div>
                <div>
                  <span class="status-badge ${contract.status === 'Mbyllur' || contract.status === 'Mbyllur me vonese' ? 'status-completed' : 'status-active'}">
                    ${contract.status}
                  </span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Vlera e Kontratës:</div>
                <div>£${contract.contract_value || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Falënderojmë për besimin tuaj!</p>
            <p>Alban Construction</p>
            <p>Email: info@albanconstruction.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate text për contract details email
  generateContractDetailsEmailText(contract) {
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return `
Detajet e Kontratës #${contract.contract_number} - ${contract.company}

Informacionet e Kontratës:
- Kompania: ${contract.company}
- Kontrata #: ${contract.contract_number}
- Vendodhja: ${contract.site_name || 'N/A'}
- Adresa: ${contract.address || 'N/A'}
- Data e Fillimit: ${formatDate(contract.start_date)}
- Data e Mbarimit: ${formatDate(contract.finish_date)}
- Statusi: ${contract.status}
- Vlera e Kontratës: £${contract.contract_value || 'N/A'}

Falënderojmë për besimin tuaj!
Alban Construction
    `;
  }

  // Get service status
  getServiceStatus() {
    return {
      initialized: !!this.resend,
      provider: 'Resend',
      apiKeyConfigured: !!process.env.RESEND_API_KEY,
      testEmail: process.env.TEST_EMAIL || 'Not configured',
      fromEmail: 'onboarding@resend.dev'
    };
  }
}

// Create instance
const emailService = new EmailService();

// Export functions for use in controllers
module.exports = {
  EmailService,
  sendInvoiceEmail: (invoice, contract, recipientEmail, pdfBuffer) => emailService.sendInvoiceEmail(invoice, contract, recipientEmail, pdfBuffer),
  sendContractDetailsEmail: (contract, recipientEmail) => emailService.sendContractDetailsEmail(contract, recipientEmail),
  sendWelcomeEmail: (userData) => emailService.sendWelcomeEmail(userData),
  sendPasswordResetEmail: (email, resetToken) => emailService.sendPasswordResetEmail(email, resetToken),
  sendNotificationEmail: (email, subject, message, type) => emailService.sendNotificationEmail(email, subject, message, type),
  testEmailService: () => emailService.testEmailService(),
  getServiceStatus: () => emailService.getServiceStatus()
}; 
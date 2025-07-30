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

module.exports = EmailService; 
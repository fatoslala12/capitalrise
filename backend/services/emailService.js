const nodemailer = require('nodemailer');
const { createError } = require('../middleware/errorHandler');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize transporter
  async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service u inicializua me sukses');
    } catch (error) {
      console.error('❌ Gabim në inicializimin e email service:', error);
      this.transporter = null;
    }
  }

  // Dërgo email për user të ri
  async sendWelcomeEmail(userData) {
    try {
      if (!this.transporter) {
        throw createError('EMAIL_SERVICE_ERROR', null, 'Email service nuk është i disponueshëm');
      }

      const { email, firstName, lastName, password, role } = userData;
      
      const subject = 'Mirëseerdhët në Alban Construction!';
      const htmlContent = this.generateWelcomeEmailHTML(userData);
      const textContent = this.generateWelcomeEmailText(userData);

      const mailOptions = {
        from: `"Alban Construction" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email u dërgua me sukses:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
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
      if (!this.transporter) {
        throw createError('EMAIL_SERVICE_ERROR', null, 'Email service nuk është i disponueshëm');
      }

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      
      const subject = 'Reset Fjalëkalimi - Alban Construction';
      const htmlContent = this.generatePasswordResetHTML(email, resetUrl);
      const textContent = this.generatePasswordResetText(email, resetUrl);

      const mailOptions = {
        from: `"Alban Construction" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Password reset email u dërgua me sukses:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
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
      if (!this.transporter) {
        throw createError('EMAIL_SERVICE_ERROR', null, 'Email service nuk është i disponueshëm');
      }

      const htmlContent = this.generateNotificationHTML(subject, message, type);
      const textContent = this.generateNotificationText(subject, message, type);

      const mailOptions = {
        from: `"Alban Construction" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Notification email u dërgua me sukses:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
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
          .welcome-text {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
          }
          .credentials-box {
            background-color: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .credential-item {
            margin: 10px 0;
            font-weight: 500;
          }
          .credential-label {
            color: #1976d2;
            font-weight: bold;
          }
          .login-button {
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
          .login-button:hover {
            background-color: #1565c0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background-color: #fff3e0;
            border: 1px solid #ffcc02;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #e65100;
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
          
          <p>Ju u krijua një llogari e re në sistemin e Alban Construction. Ju lutem ndiqni linkun më poshtë për tu loguar:</p>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="login-button">🔐 Hyr në Sistem</a>
          </div>
          
          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #1976d2;">Kredencialet tuaja:</h3>
            <div class="credential-item">
              <span class="credential-label">Email:</span> ${email}
            </div>
            <div class="credential-item">
              <span class="credential-label">Fjalëkalimi:</span> ${password}
            </div>
            <div class="credential-item">
              <span class="credential-label">Roli:</span> ${this.getRoleLabel(role)}
            </div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Siguria:</strong> Ju lutem ndryshoni fjalëkalimin tuaj pas hyrjes së parë në sistem për sigurinë e llogarisë suaj.
          </div>
          
          <p><strong>Link për hyrje:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
          
          <p>Nëse keni ndonjë pyetje ose problem, ju lutem kontaktoni administratorin e sistemit.</p>
          
          <div class="footer">
            <p>Ky email u dërgua automatikisht nga sistemi i Alban Construction.</p>
            <p>Ju lutem mos përgjigjuni këtij email-i.</p>
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

Ju u krijua një llogari e re në sistemin e Alban Construction. Ju lutem ndiqni linkun më poshtë për tu loguar:

Link për hyrje: ${loginUrl}

Kredencialet tuaja:
- Email: ${email}
- Fjalëkalimi: ${password}
- Roli: ${this.getRoleLabel(role)}

⚠️ Siguria: Ju lutem ndryshoni fjalëkalimin tuaj pas hyrjes së parë në sistem për sigurinë e llogarisë suaj.

Nëse keni ndonjë pyetje ose problem, ju lutem kontaktoni administratorin e sistemit.

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
      if (!this.transporter) {
        throw new Error('Email service nuk është inicializuar');
      }

      const testEmail = {
        from: `"Alban Construction" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // Send to self for testing
        subject: 'Test Email - Alban Construction',
        html: '<h1>Test Email</h1><p>Ky është një test email për të verifikuar funksionimin e email service.</p>',
        text: 'Test Email - Ky është një test email për të verifikuar funksionimin e email service.'
      };

      const result = await this.transporter.sendMail(testEmail);
      
      console.log('✅ Test email u dërgua me sukses:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ Gabim në test email:', error);
      throw error;
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      initialized: !!this.transporter,
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: process.env.SMTP_PORT || 587,
      smtpUser: process.env.SMTP_USER ? 'Configured' : 'Not configured'
    };
  }
}

module.exports = EmailService; 
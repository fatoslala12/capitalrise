require('dotenv').config();
const pool = require('../db');
const { Resend } = require('resend');

// Inicializo Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

class NotificationService {
  // Krijo një njoftim të ri
  static async createNotification(userId, title, message, type = 'info', category = 'system', relatedId = null, relatedType = null, priority = 1) {
    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, category, related_id, related_type, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, title, message, type, category, relatedId, relatedType, priority]
      );
      
      const notification = result.rows[0];
      
      // Dërgo real-time notification nëse klienti është i lidhur
      this.sendRealTimeNotification(userId, notification);
      
      // Dërgo email notification nëse është e konfiguruar
      await this.sendEmailNotification(userId, title, message, type);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Dërgo real-time notification (tani vetëm logging)
  static sendRealTimeNotification(userId, notification) {
    try {
      console.log(`[DEBUG] Real-time notification would be sent to user ${userId}: ${notification.title}`);
      console.log(`[DEBUG] Notification details:`, notification);
    } catch (error) {
      console.error('[ERROR] Error in sendRealTimeNotification:', error);
    }
  }

  // Dërgo email notification
  static async sendEmailNotification(userId, title, message, type = 'info') {
    try {
      // Kontrollo nëse RESEND_API_KEY është konfiguruar
      if (!process.env.RESEND_API_KEY) {
        console.log('[WARNING] RESEND_API_KEY nuk është konfiguruar. Email nuk do të dërgohet.');
        return;
      }

      // Kontrollo notification settings të përdoruesit
      const userResult = await pool.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        console.log('[WARNING] User not found for email notification:', userId);
        return;
      }
      
      const user = userResult.rows[0];
      if (!user.email) {
        console.log('[WARNING] User has no email address:', userId);
        return;
      }

      // Kontrollo nëse email notifications janë të aktivizuara (për momentin të gjitha janë të aktivizuara)
      // TODO: Implemento notification settings kur të shtohet kolona në databazë



      console.log(`[DEBUG] Sending email notification to ${user.email}: ${title}`);

      // Përcakto ikonën bazuar në tipin e njoftimit
      const getNotificationIcon = (type) => {
        switch (type) {
          case 'success': return '✅';
          case 'warning': return '⚠️';
          case 'error': return '❌';
          case 'info': return 'ℹ️';
          default: return '🔔';
        }
      };

      // Përgatit email-in
      if (!resend) {
        console.log('[WARNING] Resend not initialized. Email nuk do të dërgohet.');
        return;
      }
      
      const { data, error } = await resend.emails.send({
        from: 'Alban Construction <onboarding@resend.dev>',
        to: [user.email],
        subject: `Ju keni një njoftim të ri në Alban Construction`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 24px;">🏗️ Alban Construction</h1>
              </div>
              
              <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 32px; display: block; margin-bottom: 10px;">${getNotificationIcon(type)}</span>
                  <h2 style="margin: 0; color: #1e293b; font-size: 18px;">Ju keni një njoftim të ri në sistem!</h2>
                </div>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                  <p style="margin: 0 0 10px 0; color: #1e293b; font-weight: bold;">Titulli: ${title}</p>
                  <p style="margin: 0; color: #475569; line-height: 1.6;">Mesazhi: ${message}</p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; margin: 0; font-size: 14px;">
                  Mirë se vini, ${user.email},
                </p>
                <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">
                  Ky është një njoftim automatik i dërguar nga sistemi ynë i menaxhimit.
                </p>
                <p style="color: #64748b; margin: 15px 0 0 0; font-size: 12px;">
                  Për të parë të gjitha njoftimet dhe detajet e mëtejshme, ju lutemi:
                </p>
                <div style="margin-top: 15px;">
                  <a href="https://building-system-seven.vercel.app/admin/notifications" 
                     style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    🔗 Kliko këtu për të aksesuar njoftimin
                  </a>
                </div>
              </div>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('[ERROR] Error sending email notification:', error);
      } else {
        console.log(`[SUCCESS] Email notification sent successfully to: ${user.email}`);
      }
      
    } catch (error) {
      console.error('[ERROR] Error in sendEmailNotification:', error);
      // Mos bëj throw error që të mos ndalojë procesin kryesor
    }
  }

  // Dërgo email notification për admin specifik
  static async sendAdminEmailNotification(title, message, type = 'info') {
    try {
      // Kontrollo nëse RESEND_API_KEY është konfiguruar
      if (!process.env.RESEND_API_KEY) {
        console.log('[WARNING] RESEND_API_KEY nuk është konfiguruar. Email nuk do të dërgohet.');
        return;
      }

      const adminEmail = 'fatoslala12@gmail.com';
      console.log(`[DEBUG] Sending admin email notification to ${adminEmail}: ${title}`);

      // Përcakto ikonën bazuar në tipin e njoftimit
      const getNotificationIcon = (type) => {
        switch (type) {
          case 'success': return '✅';
          case 'warning': return '⚠️';
          case 'error': return '❌';
          case 'info': return 'ℹ️';
          default: return '🔔';
        }
      };

      // Përgatit email-in për admin
      if (!resend) {
        console.log('[WARNING] Resend not initialized. Email nuk do të dërgohet.');
        return;
      }
      
      const { data, error } = await resend.emails.send({
        from: 'Alban Construction <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `[ADMIN] ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #dc2626; margin: 0; font-size: 24px;">👑 Admin Notification</h1>
                <h2 style="color: #2563eb; margin: 10px 0 0 0; font-size: 20px;">🏗️ Alban Construction</h2>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 32px; display: block; margin-bottom: 10px;">${getNotificationIcon(type)}</span>
                  <h2 style="margin: 0; color: #1e293b; font-size: 18px;">${title}</h2>
                </div>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                  <p style="margin: 0; color: #475569; line-height: 1.6; font-size: 14px;">${message}</p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; margin: 0; font-size: 14px;">
                  Mirë se vini, Admin,
                </p>
                <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">
                  Ky është një njoftim automatik i dërguar nga sistemi ynë i menaxhimit.
                </p>
                <p style="color: #64748b; margin: 15px 0 0 0; font-size: 12px;">
                  Për të parë të gjitha njoftimet dhe detajet e mëtejshme, ju lutemi:
                </p>
                <div style="margin-top: 15px;">
                  <a href="https://building-system-seven.vercel.app/admin/notifications" 
                     style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    🔗 Kliko këtu për të aksesuar njoftimin
                  </a>
                </div>
              </div>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('[ERROR] Error sending admin email notification:', error);
      } else {
        console.log(`[SUCCESS] Admin email notification sent successfully to: ${adminEmail}`);
      }
      
    } catch (error) {
      console.error('[ERROR] Error in sendAdminEmailNotification:', error);
    }
  }

  // Merr njoftimet për një përdorues
  static async getUserNotifications(userId, limit = 50, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Merr numrin e njoftimeve të palexuara
  static async getUnreadCount(userId) {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [userId]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Mark as read
  static async markAsRead(notificationId, userId) {
    try {
      const result = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
      );
      
      if (result.rows.length > 0) {
        const notification = result.rows[0];
        
        // Dërgo real-time update për mark as read
        this.sendRealTimeNotification(userId, {
          ...notification,
          action: 'markAsRead'
        });
        
        return notification;
      }
      return null;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all as read
  static async markAllAsRead(userId) {
    try {
      const result = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 RETURNING *',
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Fshi një njoftim
  static async deleteNotification(notificationId, userId) {
    try {
      const result = await pool.query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
      );
      
      if (result.rows.length > 0) {
        const notification = result.rows[0];
        
        // Dërgo real-time update për delete
        this.sendRealTimeNotification(userId, {
          ...notification,
          action: 'delete'
        });
        
        return notification;
      }
      return null;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Njoftimet për ADMIN - Email notifications
  static async notifyAdminEmailSent(invoiceId, contractId, type) {
    try {
      const adminUsers = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );
      
      const title = type === 'invoice' ? 'Fatura u dërgua me sukses' : 'Detajet e kontratës u dërguan';
      const message = type === 'invoice' 
        ? `Fatura u dërgua me sukses në email`
        : `Detajet e kontratës u dërguan me sukses në email`;

      for (const user of adminUsers.rows) {
        await this.createNotification(
          user.id, 
          title, 
          message, 
          'success', 
          'email', 
          type === 'invoice' ? invoiceId : contractId, 
          type === 'invoice' ? 'invoice' : 'contract'
        );
      }
    } catch (error) {
      console.error('Error notifying admin about email:', error);
    }
  }

  // Njoftimet për ADMIN - Work hours
  static async notifyAdminWorkHours(employeeName, action) {
    try {
      const adminUsers = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );
      
      const title = 'Orët e punës u përditësuan';
      const message = `Manager ${action} orët e punës: ${employeeName}`;

      for (const user of adminUsers.rows) {
        await this.createNotification(
          user.id, 
          title, 
          message, 
          'info', 
          'work_hours'
        );
      }
    } catch (error) {
      console.error('Error notifying admin about work hours:', error);
    }
  }

  // Njoftimet për MANAGER - Contract assignment
  static async notifyManagerContractAssignment(managerId, contractName) {
    try {
      const title = 'Kontratë e re u caktua';
      const message = `Ju u caktua një kontratë e re: ${contractName}`;
      
      await this.createNotification(
        managerId, 
        title, 
        message, 
        'info', 
        'contract'
      );
    } catch (error) {
      console.error('Error notifying manager about contract assignment:', error);
    }
  }

  // Njoftimet për USER - Payment
  static async notifyUserPayment(userId, amount) {
    try {
      const title = 'Pagesa u konfirmua';
      const message = `Orët tuaja u paguan: £${amount}`;
      
      await this.createNotification(
        userId, 
        title, 
        message, 
        'success', 
        'payment'
      );
    } catch (error) {
      console.error('Error notifying user about payment:', error);
    }
  }

  // Njoftimet për USER - Site assignment
  static async notifyUserSiteAssignment(userId, siteName) {
    try {
      const title = 'Site i ri u caktua';
      const message = `Ju u caktua një site i ri: ${siteName}`;
      
      await this.createNotification(
        userId, 
        title, 
        message, 
        'info', 
        'site'
      );
    } catch (error) {
      console.error('Error notifying user about site assignment:', error);
    }
  }

  // Njoftimet për USER - Task assignment
  static async notifyUserTaskAssignment(userId, taskName) {
    try {
      const title = 'Detyrë e re u caktua';
      const message = `Ju u caktua një detyrë e re: ${taskName}`;
      
      await this.createNotification(
        userId, 
        title, 
        message, 
        'info', 
        'task'
      );
    } catch (error) {
      console.error('Error notifying user about task assignment:', error);
    }
  }

  // Njoftimet për ADMIN - Task completion
  static async notifyAdminTaskCompleted(taskName, employeeId) {
    try {
      const adminUsers = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );
      
      // Merr emrin e punonjësit
      const employeeResult = await pool.query(
        "SELECT first_name, last_name FROM employees WHERE id = $1",
        [employeeId]
      );
      
      const employeeName = employeeResult.rows.length > 0 
        ? `${employeeResult.rows[0].first_name} ${employeeResult.rows[0].last_name}`
        : `Punonjësi ${employeeId}`;
      
      const title = '✅ Detyrë u përfundua';
      const message = `Detyra "${taskName}" u përfundua nga ${employeeName}`;

      for (const user of adminUsers.rows) {
        await this.createNotification(
          user.id, 
          title, 
          message, 
          'success', 
          'task', 
          null, 
          'task_completed'
        );
      }
    } catch (error) {
      console.error('Error notifying admin about task completion:', error);
    }
  }

  // Reminder për ADMIN - Unpaid work hours (1 javë)
  static async checkUnpaidWorkHours() {
    try {
      const result = await pool.query(`
        SELECT DISTINCT wh.employee_id, e.name as employee_name
        FROM work_hours wh
        JOIN employees e ON wh.employee_id = e.id
        WHERE wh.paid = FALSE 
        AND wh.date < NOW() - INTERVAL '7 days'
      `);

      if (result.rows.length > 0) {
        const adminUsers = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        const title = '⚠️ Punonjës pa paguar!';
        const message = 'Ju keni punonjës pa paguar! Kontrolloni orët e punës të papaguara';

        for (const user of adminUsers.rows) {
          await this.createNotification(
            user.id, 
            title, 
            message, 
            'warning', 
            'reminder', 
            null, 
            null, 
            3
          );
        }
      }
    } catch (error) {
      console.error('Error checking unpaid work hours:', error);
    }
  }

  // Reminder për ADMIN - Unpaid invoices (1 javë)
  static async checkUnpaidInvoices() {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM invoices 
        WHERE paid = FALSE 
        AND date < NOW() - INTERVAL '7 days'
      `);

      if (parseInt(result.rows[0].count) > 0) {
        const adminUsers = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        const title = '🧾 Faturat e papaguara!';
        const message = `Ka ${result.rows[0].count} faturat e papaguara që duhen përfunduar këtë javë. Kontrolloni!`;

        for (const user of adminUsers.rows) {
          await this.createNotification(
            user.id, 
            title, 
            message, 
            'warning', 
            'reminder', 
            null, 
            null, 
            2
          );
        }
      }
    } catch (error) {
      console.error('Error checking unpaid invoices:', error);
    }
  }

  // Reminder për ADMIN - Unpaid expenses (1 javë)
  static async checkUnpaidExpenses() {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM expenses 
        WHERE paid = FALSE 
        AND date < NOW() - INTERVAL '7 days'
      `);

      if (parseInt(result.rows[0].count) > 0) {
        const adminUsers = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        const title = '💸 Shpenzimet e papaguara!';
        const message = `Shpenzimet e këtij muaji duhen raportuar deri më 25 të këtij muaji`;

        for (const user of adminUsers.rows) {
          await this.createNotification(
            user.id, 
            title, 
            message, 
            'warning', 
            'reminder', 
            null, 
            null, 
            2
          );
        }
      }
    } catch (error) {
      console.error('Error checking unpaid expenses:', error);
    }
  }

  // Ekzekuto të gjitha kontrollet e reminder-eve
  static async runReminderChecks() {
    try {
      // Kontrollo për admin
      await this.checkUnpaidWorkHours();
      await this.checkUnpaidInvoices();
      await this.checkUnpaidExpenses();
      
      // Kontrollo për manager
      await this.checkPendingApprovals();
      
      // Kontrollo për user
      await this.checkIncompleteTasks();
      
      console.log('Reminder checks completed successfully');
    } catch (error) {
      console.error('Error running reminder checks:', error);
    }
  }

  // Njoftimet për ADMIN - Contract management
  static async notifyAdminContractCreated(contractName, contractId) {
    try {
      const adminUsers = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );
      
      const title = '📄 Kontratë e re u krijua';
      const message = `Kontrata "${contractName}" u krijua dhe është gati për caktim`;

      for (const user of adminUsers.rows) {
        await this.createNotification(
          user.id, 
          title, 
          message, 
          'info', 
          'contract', 
          contractId, 
          'contract'
        );
      }
    } catch (error) {
      console.error('Error notifying admin about contract creation:', error);
    }
  }

  // Njoftimet për ADMIN - Employee management
  static async notifyAdminEmployeeAdded(employeeName) {
    try {
      const adminUsers = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );
      
      const title = '👷 Punonjës i ri u shtua';
      const message = `Punonjësi "${employeeName}" u shtua në sistem`;

      for (const user of adminUsers.rows) {
        await this.createNotification(
          user.id, 
          title, 
          message, 
          'info', 
          'employee'
        );
      }
    } catch (error) {
      console.error('Error notifying admin about employee addition:', error);
    }
  }

  // Njoftimet për ADMIN - Payment processing
  static async notifyAdminPaymentProcessed(amount, employeeName) {
    try {
      const adminUsers = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );
      
      const title = '💰 Pagesa u procesua';
      const message = `Pagesa prej £${amount} u procesua për punonjësin ${employeeName}`;

      for (const user of adminUsers.rows) {
        await this.createNotification(
          user.id, 
          title, 
          message, 
          'success', 
          'payment'
        );
      }
    } catch (error) {
      console.error('Error notifying admin about payment processing:', error);
    }
  }

  // Njoftimet për MANAGER - Task management
  static async notifyManagerTaskAssigned(managerId, taskName, employeeName) {
    try {
      const title = '📝 Detyrë e re u caktua';
      const message = `Detyra "${taskName}" u caktua për punonjësin ${employeeName}`;
      
      await this.createNotification(
        managerId, 
        title, 
        message, 
        'info', 
        'task'
      );
    } catch (error) {
      console.error('Error notifying manager about task assignment:', error);
    }
  }

  // Njoftimet për MANAGER - Employee updates
  static async notifyManagerEmployeeUpdate(managerId, employeeName, action) {
    try {
      const title = '👷 Përditësim i punonjësit';
      const message = `Punonjësi ${employeeName} ${action}`;
      
      await this.createNotification(
        managerId, 
        title, 
        message, 
        'info', 
        'employee'
      );
    } catch (error) {
      console.error('Error notifying manager about employee update:', error);
    }
  }

  // Njoftimet për MANAGER - Work hours submission
  static async notifyManagerWorkHoursSubmitted(managerId, employeeName, hours) {
    try {
      const title = '⏰ Orët e punës u paraqitën';
      const message = `Punonjësi ${employeeName} paraqiti ${hours} orë pune`;
      
      await this.createNotification(
        managerId, 
        title, 
        message, 
        'info', 
        'work_hours'
      );
    } catch (error) {
      console.error('Error notifying manager about work hours submission:', error);
    }
  }

  // Njoftimet për MANAGER - Payment confirmation
  static async notifyManagerPaymentConfirmed(managerId, amount, employeeName) {
    try {
      const title = '✅ Pagesa u konfirmua';
      const message = `Pagesa prej £${amount} për ${employeeName} u konfirmua`;
      
      await this.createNotification(
        managerId, 
        title, 
        message, 
        'success', 
        'payment'
      );
    } catch (error) {
      console.error('Error notifying manager about payment confirmation:', error);
    }
  }

  // Njoftimet për USER - Work hours reminder
  static async notifyUserWorkHoursReminder(userId, weekStart, weekEnd) {
    try {
      const title = '⏰ Kujtues për orët e punës';
      const message = `Ju lutemi paraqitni orët tuaja të punës për javën ${weekStart} - ${weekEnd}`;
      
      await this.createNotification(
        userId, 
        title, 
        message, 
        'warning', 
        'reminder'
      );
    } catch (error) {
      console.error('Error notifying user about work hours reminder:', error);
    }
  }

  // Njoftimet për USER - Contract updates
  static async notifyUserContractUpdate(userId, contractName, updateType) {
    try {
      const title = '📄 Përditësim i kontratës';
      const message = `Kontrata "${contractName}" ${updateType}`;
      
      await this.createNotification(
        userId, 
        title, 
        message, 
        'info', 
        'contract'
      );
    } catch (error) {
      console.error('Error notifying user about contract update:', error);
    }
  }

  // Njoftimet për USER - Task completion
  static async notifyUserTaskCompleted(userId, taskName) {
    try {
      const title = '✅ Detyra u përfundua';
      const message = `Detyra "${taskName}" u përfundua me sukses`;
      
      await this.createNotification(
        userId, 
        title, 
        message, 
        'success', 
        'task'
      );
    } catch (error) {
      console.error('Error notifying user about task completion:', error);
    }
  }

  // Njoftimet për USER - Task overdue
  static async notifyUserTaskOverdue(userId, taskName) {
    try {
      const title = '⚠️ Detyrë e vonuar';
      const message = `Detyra "${taskName}" është e vonuar. Ju lutemi përfundojeni sa më shpejt`;
      
      await this.createNotification(
        userId, 
        title, 
        message, 
        'warning', 
        'task'
      );
    } catch (error) {
      console.error('Error notifying user about task overdue:', error);
    }
  }

  // Njoftimet për të gjitha rolet - System announcements
  static async notifySystemAnnouncement(title, message, roles = ['admin', 'manager', 'user']) {
    try {
      const users = await pool.query(
        `SELECT id FROM users WHERE role = ANY($1)`,
        [roles]
      );
      
      for (const user of users.rows) {
        await this.createNotification(
          user.id, 
          title, 
          message, 
          'info', 
          'system'
        );
      }
    } catch (error) {
      console.error('Error sending system announcement:', error);
    }
  }

  // Njoftimet për ADMIN - System maintenance
  static async notifyAdminSystemMaintenance(maintenanceType, duration) {
    try {
      const adminUsers = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );
      
      const title = '🔧 Mirëmbajtje e sistemit';
      const message = `Sistemi do të jetë në mirëmbajtje për ${duration}. ${maintenanceType}`;

      for (const user of adminUsers.rows) {
        await this.createNotification(
          user.id, 
          title, 
          message, 
          'warning', 
          'system'
        );
      }
    } catch (error) {
      console.error('Error notifying admin about system maintenance:', error);
    }
  }

  // Reminder për MANAGER - Pending approvals
  static async checkPendingApprovals() {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM work_hours 
        WHERE approved = FALSE 
        AND date < NOW() - INTERVAL '3 days'
      `);

      if (parseInt(result.rows[0].count) > 0) {
        const managerUsers = await pool.query(
          "SELECT id FROM users WHERE role = 'manager'"
        );

        const title = '⏳ Aprova të pritura!';
        const message = `Ju keni ${result.rows[0].count} orë pune që presin për aprobim`;

        for (const user of managerUsers.rows) {
          await this.createNotification(
            user.id, 
            title, 
            message, 
            'warning', 
            'reminder', 
            null, 
            null, 
            2
          );
        }
      }
    } catch (error) {
      console.error('Error checking pending approvals:', error);
    }
  }

  // Reminder për USER - Incomplete tasks
  static async checkIncompleteTasks() {
    try {
      const result = await pool.query(`
        SELECT t.id, t.title, u.id as user_id
        FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE t.status != 'completed' 
        AND t.due_date < NOW()
      `);

      for (const task of result.rows) {
        await this.notifyUserTaskOverdue(task.user_id, task.title);
      }
    } catch (error) {
      console.error('Error checking incomplete tasks:', error);
    }
  }
}

module.exports = NotificationService; 
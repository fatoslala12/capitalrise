const pool = require('../db');

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
      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
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
      return result.rows[0];
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
      return result.rows[0];
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

  // Reminder për ADMIN - Unpaid invoices (1 muaj)
  static async checkUnpaidInvoices() {
    try {
      const result = await pool.query(`
        SELECT i.id, i.invoice_number, c.company
        FROM invoices i
        JOIN contracts c ON i.contract_number = c.contract_number
        WHERE i.paid = FALSE 
        AND i.date < NOW() - INTERVAL '1 month'
      `);

      if (result.rows.length > 0) {
        const adminUsers = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        for (const invoice of result.rows) {
          const title = '⚠️ Faturë e papaguar!';
          const message = `Fatura ${invoice.invoice_number} nga kompania ${invoice.company} nuk ju është paguar akoma`;

          for (const user of adminUsers.rows) {
            await this.createNotification(
              user.id, 
              title, 
              message, 
              'warning', 
              'reminder', 
              invoice.id, 
              'invoice', 
              3
            );
          }
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
        SELECT id, expense_type, company_name
        FROM expenses
        WHERE paid = FALSE 
        AND date < NOW() - INTERVAL '7 days'
      `);

      if (result.rows.length > 0) {
        const adminUsers = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        for (const expense of result.rows) {
          const title = '⚠️ Shpenzim i papaguar!';
          const message = `Lutem paguani faturën ${expense.expense_type} për kompaninë ${expense.company_name}`;

          for (const user of adminUsers.rows) {
            await this.createNotification(
              user.id, 
              title, 
              message, 
              'warning', 
              'reminder', 
              expense.id, 
              'expense', 
              3
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking unpaid expenses:', error);
    }
  }

  // Ekzekuto të gjitha kontrollin e reminder-ëve
  static async runReminderChecks() {
    await this.checkUnpaidWorkHours();
    await this.checkUnpaidInvoices();
    await this.checkUnpaidExpenses();
  }
}

module.exports = NotificationService; 
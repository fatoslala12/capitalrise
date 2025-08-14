const { pool } = require('../db');
const NotificationService = require('./notificationService');

class TaskDeadlineNotificationService {
  // Kontrollo dhe dërgo njoftime për detyrat që janë jashtë afatit
  static async checkOverdueTasks() {
    try {
      const result = await pool.query(`
        SELECT 
          t.id,
          t.title,
          t.description,
          t.due_date,
          t.assigned_to,
          t.site_name,
          t.status,
          u.email,
          u.first_name,
          u.last_name
        FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE t.due_date < NOW() 
        AND t.status != 'completed'
        AND t.overdue_notification_sent = false
      `);

      for (const task of result.rows) {
        // Dërgo njoftim për punonjësin që detyra është jashtë afatit
        await this.sendOverdueNotificationToEmployee(task);
        
        // Dërgo njoftim për admin që detyra është jashtë afatit
        await this.sendOverdueNotificationToAdmin(task);
        
        // Shëno që njoftimi është dërguar
        await this.markOverdueNotificationSent(task.id);
      }

      console.log(`[INFO] Checked ${result.rows.length} overdue tasks`);
      return result.rows.length;
    } catch (error) {
      console.error('[ERROR] Failed to check overdue tasks:', error);
      throw error;
    }
  }

  // Kontrollo dhe dërgo njoftime për detyrat që përfundojnë së shpejti (1 ditë para)
  static async checkUpcomingDeadlines() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const result = await pool.query(`
        SELECT 
          t.id,
          t.title,
          t.description,
          t.due_date,
          t.assigned_to,
          t.site_name,
          t.status,
          u.email,
          u.first_name,
          u.last_name
        FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE DATE(t.due_date) = $1
        AND t.status != 'completed'
        AND t.upcoming_deadline_notification_sent = false
      `, [tomorrowStr]);

      for (const task of result.rows) {
        // Dërgo njoftim për punonjësin që detyra përfundon nesër
        await this.sendUpcomingDeadlineNotification(task);
        
        // Shëno që njoftimi është dërguar
        await this.markUpcomingDeadlineNotificationSent(task.id);
      }

      console.log(`[INFO] Checked ${result.rows.length} upcoming deadline tasks`);
      return result.rows.length;
    } catch (error) {
      console.error('[ERROR] Failed to check upcoming deadlines:', error);
      throw error;
    }
  }

  // Dërgo njoftim për punonjësin që detyra është jashtë afatit
  static async sendOverdueNotificationToEmployee(task) {
    try {
      const message = `Detyra juaj "${task.title || task.description}" për site-in "${task.site_name}" është JASHTË ASTATIT për përfundim. Ju lutem përfundojeni sa më shpejt të jetë e mundur.`;
      
      // Krijo njoftim në databazë
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, category, priority, related_id, related_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        task.assigned_to,
        '⚠️ Detyrë Jashtë Afatit',
        message,
        'warning',
        'task',
        3, // High priority
        task.id,
        'task'
      ]);

      // Dërgo email nëse është i lejuar
      if (NotificationService.isEmailAllowed(task.email)) {
        await NotificationService.sendEmail(
          task.email,
          '⚠️ Detyrë Jashtë Afatit - Vëmendje e Ngutshme',
          message,
          'task_overdue'
        );
      }

      console.log(`[INFO] Overdue notification sent to employee ${task.email} for task ${task.id}`);
    } catch (error) {
      console.error(`[ERROR] Failed to send overdue notification to employee ${task.email}:`, error);
    }
  }

  // Dërgo njoftim për admin që detyra është jashtë afatit
  static async sendOverdueNotificationToAdmin(task) {
    try {
      // Gjej admin users
      const adminResult = await pool.query(`
        SELECT id, email, first_name, last_name
        FROM users 
        WHERE role = 'admin'
      `);

      const message = `Detyra "${task.title || task.description}" nga punonjësi ${task.first_name} ${task.last_name} për site-in "${task.site_name}" është JASHTË ASTATIT për përfundim.`;

      for (const admin of adminResult.rows) {
        // Krijo njoftim në databazë për admin
        await pool.query(`
          INSERT INTO notifications (user_id, title, message, type, category, priority, related_id, related_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          admin.id,
          '🚨 Detyrë Jashtë Afatit nga Punonjësi',
          message,
          'error',
          'task',
          3, // High priority
          task.id,
          'task'
        ]);

        // Dërgo email nëse është i lejuar
        if (NotificationService.isEmailAllowed(admin.email)) {
          await NotificationService.sendEmail(
            admin.email,
            '🚨 Detyrë Jashtë Afatit nga Punonjësi',
            message,
            'task_overdue_admin'
          );
        }
      }

      console.log(`[INFO] Overdue notification sent to ${adminResult.rows.length} admins for task ${task.id}`);
    } catch (error) {
      console.error(`[ERROR] Failed to send overdue notification to admins for task ${task.id}:`, error);
    }
  }

  // Dërgo njoftim për punonjësin që detyra përfundon nesër
  static async sendUpcomingDeadlineNotification(task) {
    try {
      const message = `Kujtesë: Detyra juaj "${task.title || task.description}" për site-in "${task.site_name}" përfundon nesër. Ju lutem përfundojeni në kohë.`;
      
      // Krijo njoftim në databazë
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, category, priority, related_id, related_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        task.assigned_to,
        '⏰ Kujtesë: Detyrë Përfundon Nesër',
        message,
        'info',
        'task',
        2, // Medium priority
        task.id,
        'task'
      ]);

      // Dërgo email nëse është i lejuar
      if (NotificationService.isEmailAllowed(task.email)) {
        await NotificationService.sendEmail(
          task.email,
          '⏰ Kujtesë: Detyrë Përfundon Nesër',
          message,
          'task_upcoming_deadline'
        );
      }

      console.log(`[INFO] Upcoming deadline notification sent to employee ${task.email} for task ${task.id}`);
    } catch (error) {
      console.error(`[ERROR] Failed to send upcoming deadline notification to employee ${task.email}:`, error);
    }
  }

  // Shëno që njoftimi për detyrë jashtë afatit është dërguar
  static async markOverdueNotificationSent(taskId) {
    try {
      await pool.query(`
        UPDATE tasks 
        SET overdue_notification_sent = true 
        WHERE id = $1
      `, [taskId]);
    } catch (error) {
      console.error(`[ERROR] Failed to mark overdue notification sent for task ${taskId}:`, error);
    }
  }

  // Shëno që njoftimi për afat që përfundon së shpejti është dërguar
  static async markUpcomingDeadlineNotificationSent(taskId) {
    try {
      await pool.query(`
        UPDATE tasks 
        SET upcoming_deadline_notification_sent = true 
        WHERE id = $1
      `, [taskId]);
    } catch (error) {
      console.error(`[ERROR] Failed to mark upcoming deadline notification sent for task ${taskId}:`, error);
    }
  }

  // Reset notification flags për detyrat e reja (për testim)
  static async resetNotificationFlags() {
    try {
      await pool.query(`
        UPDATE tasks 
        SET 
          overdue_notification_sent = false,
          upcoming_deadline_notification_sent = false
      `);
      console.log('[INFO] Notification flags reset for all tasks');
    } catch (error) {
      console.error('[ERROR] Failed to reset notification flags:', error);
    }
  }

  // Kontrollo të gjitha detyrat dhe dërgo njoftime të nevojshme
  static async runDailyDeadlineCheck() {
    try {
      console.log('[INFO] Starting daily deadline check...');
      
      // Kontrollo detyrat jashtë afatit
      const overdueCount = await this.checkOverdueTasks();
      
      // Kontrollo detyrat që përfundojnë së shpejti
      const upcomingCount = await this.checkUpcomingDeadlines();
      
      console.log(`[INFO] Daily deadline check completed. Overdue: ${overdueCount}, Upcoming: ${upcomingCount}`);
      
      return { overdueCount, upcomingCount };
    } catch (error) {
      console.error('[ERROR] Daily deadline check failed:', error);
      throw error;
    }
  }
}

module.exports = TaskDeadlineNotificationService;
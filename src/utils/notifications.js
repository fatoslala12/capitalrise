// Notifications utility
import api from '../api';

export class NotificationService {
  // Email notifications
  static async sendEmailNotification(to, subject, message) {
    try {
      await api.post('/api/notifications/email', {
        to,
        subject,
        message
      });
      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  // Push notifications
  static async sendPushNotification(userId, title, message, data = {}) {
    try {
      await api.post('/api/notifications/push', {
        userId,
        title,
        message,
        data
      });
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Contract status change notification
  static async notifyContractStatusChange(contract, newStatus, userId) {
    const subject = `Statusi i kontratës u ndryshua`;
    const message = `Kontrata "${contract.contract_name}" ka ndryshuar statusin në "${newStatus}"`;
    
    await this.sendEmailNotification(contract.client_email, subject, message);
    await this.sendPushNotification(userId, subject, message, {
      contractId: contract.id,
      newStatus
    });
  }

  // Contract completion notification
  static async notifyContractCompletion(contract, userId) {
    const subject = `Kontrata u përfundua`;
    const message = `Kontrata "${contract.contract_name}" u përfundua me sukses!`;
    
    await this.sendEmailNotification(contract.client_email, subject, message);
    await this.sendPushNotification(userId, subject, message, {
      contractId: contract.id,
      type: 'completion'
    });
  }

  // Payment reminder notification
  static async notifyPaymentReminder(contract, daysOverdue) {
    const subject = `Kujtues për pagesën`;
    const message = `Kontrata "${contract.contract_name}" ka ${daysOverdue} ditë vonesë në pagesë`;
    
    await this.sendEmailNotification(contract.client_email, subject, message);
  }
}

export default NotificationService; 
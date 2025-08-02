import api from '../api';

// Audit service for logging user actions
class AuditService {
  static async logAction(action, module, description, details = {}) {
    try {
      await api.post('/api/audit-trail', {
        action,
        module,
        description,
        details
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw error to avoid breaking the main functionality
    }
  }

  // Predefined audit actions for common operations
  static async logCreate(module, description, details = {}) {
    return this.logAction('CREATE', module, description, details);
  }

  static async logUpdate(module, description, details = {}) {
    return this.logAction('UPDATE', module, description, details);
  }

  static async logDelete(module, description, details = {}) {
    return this.logAction('DELETE', module, description, details);
  }

  static async logLogin(description, details = {}) {
    return this.logAction('LOGIN', 'AUTH', description, details);
  }

  static async logPayment(description, details = {}) {
    return this.logAction('PAYMENT', 'PAYMENTS', description, details);
  }

  // Specific audit methods for different modules
  static async logContractCreate(contractNumber, details = {}) {
    return this.logCreate('CONTRACTS', `Kontratë e re u krijua: ${contractNumber}`, {
      contractNumber,
      ...details
    });
  }

  static async logContractUpdate(contractNumber, changes = [], details = {}) {
    return this.logUpdate('CONTRACTS', `Kontratë u përditësua: ${contractNumber}`, {
      contractNumber,
      changes,
      ...details
    });
  }

  static async logEmployeeCreate(employeeName, details = {}) {
    return this.logCreate('EMPLOYEES', `Punonjës i ri u shtua: ${employeeName}`, {
      employeeName,
      ...details
    });
  }

  static async logEmployeeUpdate(employeeName, changes = [], details = {}) {
    return this.logUpdate('EMPLOYEES', `Punonjës u përditësua: ${employeeName}`, {
      employeeName,
      changes,
      ...details
    });
  }

  static async logTaskCreate(taskTitle, details = {}) {
    return this.logCreate('TASKS', `Detyrë e re u krijua: ${taskTitle}`, {
      taskTitle,
      ...details
    });
  }

  static async logTaskUpdate(taskTitle, changes = [], details = {}) {
    return this.logUpdate('TASKS', `Detyrë u përditësua: ${taskTitle}`, {
      taskTitle,
      changes,
      ...details
    });
  }

  static async logTaskDelete(taskTitle, details = {}) {
    return this.logDelete('TASKS', `Detyrë u fshi: ${taskTitle}`, {
      taskTitle,
      ...details
    });
  }

  static async logPaymentProcess(paymentId, amount, details = {}) {
    return this.logPayment(`Pagesë u procesua: ${paymentId}`, {
      paymentId,
      amount,
      ...details
    });
  }

  static async logPaymentCancel(paymentId, reason, details = {}) {
    return this.logPayment(`Pagesë u anuluar: ${paymentId}`, {
      paymentId,
      reason,
      ...details
    });
  }

  static async logUserLogin(email, details = {}) {
    return this.logLogin(`Përdorues u kyç në sistem: ${email}`, {
      email,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

export default AuditService;
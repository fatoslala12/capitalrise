// Push Notifications Utility
class PushNotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.log('Push notifications nuk mbështeten në këtë browser');
      return;
    }

    // Kontrollo nëse ka permission
    if (this.permission === 'default') {
      this.permission = await this.requestPermission();
    }

    // Regjistro service worker për push notifications
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker u regjistrua:', registration);
      } catch (error) {
        console.error('Gabim në regjistrimin e Service Worker:', error);
      }
    }
  }

  async requestPermission() {
    if (!this.isSupported) return 'denied';

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Gabim në kërkimin e permission:', error);
      return 'denied';
    }
  }

  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.log('Push notifications nuk janë të lejuara');
      return;
    }

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      // Shto event listeners
      notification.onclick = () => {
        notification.close();
        // Fokus në window
        window.focus();
        
        // Navigo në faqen e njoftimeve
        if (options.url) {
          window.location.href = options.url;
        }
      };

      notification.onclose = () => {
        console.log('Push notification u mbyll');
      };

      // Auto close pas 5 sekondash
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Gabim në shfaqjen e push notification:', error);
    }
  }

  async showContractNotification(contractName, contractId) {
    return this.showNotification('📄 Kontratë e re', {
      body: `Kontrata "${contractName}" u krijua dhe është gati për caktim`,
      tag: `contract-${contractId}`,
      url: `/admin/contracts/${contractId}`,
      icon: '/icons/contract.png'
    });
  }

  async showPaymentNotification(amount, employeeName) {
    return this.showNotification('💰 Pagesa u konfirmua', {
      body: `Pagesa prej £${amount} për ${employeeName} u konfirmua`,
      tag: 'payment-confirmed',
      url: '/admin/payments',
      icon: '/icons/payment.png'
    });
  }

  async showTaskNotification(taskName, employeeName) {
    return this.showNotification('📝 Detyrë e re u caktua', {
      body: `Detyra "${taskName}" u caktua për ${employeeName}`,
      tag: 'task-assigned',
      url: '/admin/tasks',
      icon: '/icons/task.png'
    });
  }

  async showWorkHoursNotification(hours, weekRange) {
    return this.showNotification('⏰ Orët e punës u paraqitën', {
      body: `${hours} orë pune u paraqitën për javën ${weekRange}`,
      tag: 'work-hours-submitted',
      url: '/admin/work-hours',
      icon: '/icons/work-hours.png'
    });
  }

  async showSystemNotification(title, message) {
    return this.showNotification('🔧 ' + title, {
      body: message,
      tag: 'system-notification',
      url: '/admin/notifications',
      icon: '/icons/system.png'
    });
  }

  async showReminderNotification(type, message) {
    const icons = {
      'work_hours': '/icons/reminder.png',
      'invoice': '/icons/invoice.png',
      'expense': '/icons/expense.png',
      'task': '/icons/task-overdue.png'
    };

    return this.showNotification('⚠️ Kujtues', {
      body: message,
      tag: `reminder-${type}`,
      url: `/admin/${type}`,
      icon: icons[type] || '/icons/reminder.png'
    });
  }

  // Test push notification
  async testNotification() {
    return this.showNotification('🧪 Test Push Notification', {
      body: 'Ky është një test për push notifications. Nëse e shihni këtë, push notifications funksionojnë!',
      tag: 'test-notification',
      url: '/admin/notifications',
      icon: '/icons/test.png'
    });
  }

  // Kontrollo statusin e push notifications
  getStatus() {
    return {
      isSupported: this.isSupported,
      permission: this.permission,
      canShow: this.isSupported && this.permission === 'granted'
    };
  }

  // Fshi të gjitha notifications
  clearAll() {
    if (this.isSupported) {
      // Fshi të gjitha notifications e hapura
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.getNotifications().then(notifications => {
              notifications.forEach(notification => notification.close());
            });
          });
        });
      }
    }
  }
}

// Krijo instancë globale
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
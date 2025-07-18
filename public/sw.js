// Service Worker për Push Notifications
const CACHE_NAME = 'alban-construction-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache u hap');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Kthe nga cache nëse ekziston
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Push event
self.addEventListener('push', (event) => {
  console.log('Push event u mor:', event);
  
  let notificationData = {
    title: 'Njoftim i ri',
    body: 'Ju keni një njoftim të ri në Alban Construction',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: '/admin/notifications'
    }
  };

  // Nëse ka data në push event
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (error) {
      console.error('Gabim në parsing të push data:', error);
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: notificationData.vibrate,
    data: notificationData.data,
    requireInteraction: false,
    silent: false,
    tag: notificationData.tag || 'default',
    actions: [
      {
        action: 'view',
        title: 'Shiko',
        icon: '/icons/view.png'
      },
      {
        action: 'close',
        title: 'Mbyll',
        icon: '/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Fokus në window ekzistues ose hap një të ri
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Kontrollo nëse ka window të hapur
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Hap window të ri nëse nuk ka
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/admin/notifications';
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification u mbyll:', event);
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Sync notifications në background
      syncNotifications()
    );
  }
});

// Funksioni për sync notifications
async function syncNotifications() {
  try {
    // Merr njoftimet e reja nga serveri
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const notifications = await response.json();
      
      // Shfaq push notifications për njoftimet e reja
      notifications.forEach(notification => {
        self.registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: {
            url: `/admin/notifications/${notification.id}`
          }
        });
      });
    }
  } catch (error) {
    console.error('Gabim në sync notifications:', error);
  }
}

// Periodik sync
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync:', event);
  
  if (event.tag === 'notification-check') {
    event.waitUntil(
      syncNotifications()
    );
  }
});

// Message event për komunikim me main thread
self.addEventListener('message', (event) => {
  console.log('Message nga main thread:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Update event
self.addEventListener('updatefound', () => {
  console.log('Service Worker update u gjet');
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker u aktivizua');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Fshi cache të vjetër:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 
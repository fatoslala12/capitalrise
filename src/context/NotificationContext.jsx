import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Merr të gjitha njoftimet
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.get('/api/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Gabim në marrjen e njoftimeve:', error);
    } finally {
      setLoading(false);
    }
  };

  // Shëno njoftimin si të lexuar
  const markAsRead = async (notificationId) => {
    try {
      // Përditëso UI menjëherë
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Pastaj dërgo request në backend
      await api.patch(`/api/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Gabim në shënimin si të lexuar:', error);
    }
  };

  // Shëno të gjitha si të lexuara
  const markAllAsRead = async () => {
    try {
      // Përditëso UI menjëherë
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      // Pastaj dërgo request në backend
      await api.patch('/api/notifications/mark-all-read');
    } catch (error) {
      console.error('Gabim në shënimin e të gjitha si të lexuara:', error);
    }
  };

  // Fshi njoftimin
  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        const wasUnread = prev.find(n => n.id === notificationId)?.isRead === false;
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return filtered;
      });
    } catch (error) {
      console.error('Gabim në fshirjen e njoftimit:', error);
    }
  };

  // Shto njoftim të ri (për real-time updates)
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Emit event për komponentët e tjerë
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('newNotification', { 
        detail: notification 
      }));
    }
  };

  // Merr njoftimet kur komponenti mountohet
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // EventSource për real-time notifications
  useEffect(() => {
    if (!user) return;

    console.log('[DEBUG] Setting up EventSource for user:', user.id);
    
    let eventSource;
    let pollingInterval;
    
    try {
      eventSource = new EventSource(`/api/notifications/stream?userId=${user.id}`);

      eventSource.onopen = () => {
        console.log('[DEBUG] EventSource connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[DEBUG] EventSource message received:', data);
          
          if (data.type === 'notification') {
            if (data.notification.action === 'markAsRead') {
              // Përditëso notification ekzistuese
              setNotifications(prev => 
                prev.map(n => 
                  n.id === data.notification.id ? { ...n, isRead: true } : n
                )
              );
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (data.notification.action === 'delete') {
              // Hiq notification nga lista
              setNotifications(prev => 
                prev.filter(n => n.id !== data.notification.id)
              );
              // Kontrollo nëse ishte unread
              const wasUnread = notifications.find(n => n.id === data.notification.id)?.isRead === false;
              if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            } else {
              // Njoftim i ri
              addNotification(data.notification);
            }
          } else if (data.type === 'heartbeat') {
            console.log('[DEBUG] EventSource heartbeat received');
          }
        } catch (error) {
          console.error('[ERROR] Error parsing EventSource message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[ERROR] EventSource error:', error);
        eventSource.close();
        
        // Fallback to polling nëse EventSource dështon
        console.log('[DEBUG] Falling back to polling');
        pollingInterval = setInterval(() => {
          fetchNotifications();
        }, 10000); // Poll çdo 10 sekonda
      };
    } catch (error) {
      console.error('[ERROR] Failed to create EventSource:', error);
      
      // Fallback to polling
      console.log('[DEBUG] Using polling as fallback');
      pollingInterval = setInterval(() => {
        fetchNotifications();
      }, 10000); // Poll çdo 10 sekonda
    }

    return () => {
      console.log('[DEBUG] Cleaning up EventSource/polling');
      if (eventSource) {
        eventSource.close();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [user]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 
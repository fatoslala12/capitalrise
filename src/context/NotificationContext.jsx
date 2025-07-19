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
      console.log('[DEBUG] Fetched notifications:', response.data);
      
      const unreadCount = response.data.filter(n => !n.isRead).length;
      console.log('[DEBUG] Unread count from API:', unreadCount);
      
      setNotifications(response.data);
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('[ERROR] Gabim në marrjen e njoftimeve:', error);
    } finally {
      setLoading(false);
    }
  };

  // Shëno njoftimin si të lexuar
  const markAsRead = async (notificationId) => {
    try {
      console.log('[DEBUG] Marking notification as read:', notificationId);
      
      // Përditëso UI menjëherë
      setNotifications(prev => {
        const updated = prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        console.log('[DEBUG] Updated notifications:', updated);
        return updated;
      });
      
      setUnreadCount(prev => {
        const newCount = Math.max(0, prev - 1);
        console.log('[DEBUG] Updated unread count:', newCount);
        return newCount;
      });
      
      // Pastaj dërgo request në backend
      const response = await api.patch(`/api/notifications/${notificationId}/read`);
      console.log('[DEBUG] Backend response:', response.data);
    } catch (error) {
      console.error('[ERROR] Gabim në shënimin si të lexuar:', error);
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

  // Polling për real-time notifications (zëvendëson EventSource)
  useEffect(() => {
    if (!user) return;

    console.log('[DEBUG] Setting up polling for user:', user.id);
    
    // Poll çdo 5 sekonda për updates
    const pollingInterval = setInterval(() => {
      console.log('[DEBUG] Polling for notifications...');
      fetchNotifications();
    }, 5000); // Poll çdo 5 sekonda

    return () => {
      console.log('[DEBUG] Cleaning up polling');
      clearInterval(pollingInterval);
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
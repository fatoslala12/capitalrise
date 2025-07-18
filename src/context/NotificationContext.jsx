import { createContext, useContext, useState, useEffect } from 'react';
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Merr të gjitha njoftimet
  const fetchNotifications = async () => {
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
      await api.patch(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Gabim në shënimin si të lexuar:', error);
    }
  };

  // Shëno të gjitha si të lexuara
  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
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
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Merr njoftimet kur komponenti mountohet
  useEffect(() => {
    fetchNotifications().finally(() => {
      setIsInitialized(true);
    });
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    isInitialized,
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
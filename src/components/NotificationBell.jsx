import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import api from '../api';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showNewNotification, setShowNewNotification] = useState(false);
  const [newNotification, setNewNotification] = useState(null);
  
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

  // Real-time notification listener
  useEffect(() => {
    if (!user) return;

    // Krijo EventSource për real-time notifications
    const eventSource = new EventSource(`/api/notifications/stream?userId=${user.id}`);
    
    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      
      // Shto njoftimin e ri në listë
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Shfaq toast notification
      setNewNotification(notification);
      setShowNewNotification(true);
      
      // Fshi toast pas 5 sekondash
      setTimeout(() => {
        setShowNewNotification(false);
        setNewNotification(null);
      }, 5000);
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user]);

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
      // Nëse ka gabim, mos kthe mbrapa state-in
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
      // Nëse ka gabim, mos kthe mbrapa state-in
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

  // Merr njoftimet kur komponenti mountohet
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Nëse përdoruesi nuk është i loguar, mos shfaq asgjë
  if (!user) {
    return null;
  }

  // Mbyll dropdown-in kur klikohet jashtë
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
    
    // Navigo në faqen e duhur bazuar në tipin e njoftimit dhe rolin e përdoruesit
    const basePath = `/${user?.role}`;
    switch (notification.type) {
      case 'contract_assigned':
        navigate(`${basePath}/contracts`);
        break;
      case 'payment_received':
        navigate(`${basePath}/payments`);
        break;
      case 'task_assigned':
        if (user?.role === 'user') {
          navigate(`${basePath}/my-tasks`);
        } else {
          navigate(`${basePath}/tasks`);
        }
        break;
      case 'work_hours_reminder':
        navigate(`${basePath}/work-hours`);
        break;
      case 'invoice_reminder':
        navigate(`${basePath}/payments`);
        break;
      case 'expense_reminder':
        navigate(`${basePath}/reports`);
        break;
      default:
        break;
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate(`/${user?.role}/notifications`);
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Tani';
    
    const now = new Date();
    const date = new Date(dateString);
    
    // Kontrollo nëse data është e vlefshme
    if (isNaN(date.getTime())) {
      return 'Tani';
    }
    
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Tani';
    if (diffInMinutes < 60) return `${diffInMinutes}m më parë`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h më parë`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d më parë`;
    
    return date.toLocaleDateString('sq-AL');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'contract_assigned':
        return '📄';
      case 'payment_received':
        return '💰';
      case 'task_assigned':
        return '📝';
      case 'work_hours_reminder':
        return '🕒';
      case 'invoice_reminder':
        return '🧾';
      case 'expense_reminder':
        return '💸';
      default:
        return '🔔';
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {showNewNotification && newNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <span className="text-lg">{getNotificationIcon(newNotification.type)}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{newNotification.title}</p>
                <p className="text-gray-600 text-xs mt-1">{newNotification.message}</p>
              </div>
              <button
                onClick={() => setShowNewNotification(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        {/* Bell Icon */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
          title="Njoftimet"
        >
          <Bell size={20} className="group-hover:scale-110 transition-transform duration-200" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden animate-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900">Njoftimet</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                  >
                    Shëno të gjitha
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Duke ngarkuar...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Nuk ka njoftime</p>
                  <p className="text-xs text-gray-400 mt-1">Ju do të njoftoheni kur të ketë diçka të re</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-200 group ${
                      !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${!notification.isRead ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                            title="Shëno si të lexuar"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Fshi njoftimin"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleViewAll}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-100 py-2 rounded-lg transition-colors"
                >
                  Shiko të gjitha njoftimet ({notifications.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationBell; 
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, Trash2 } from 'lucide-react';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Të dhëna të thjeshta për testim
  const [notifications] = useState([]);
  const [unreadCount] = useState(0);

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
    navigate('/notifications');
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
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
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Njoftimet</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nuk ka njoftime
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={handleViewAll}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Shiko të gjitha njoftimet ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 
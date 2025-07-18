import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Filter, Trash2, Check, ArrowLeft } from 'lucide-react';

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  
  // Të dhëna të thjeshta për testim - pa kontekst
  const [notifications] = useState([]);
  const [loading] = useState(false);

  // Filtro njoftimet
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    
    const matchesRead = filterRead === 'all' || 
                       (filterRead === 'unread' && !notification.isRead) ||
                       (filterRead === 'read' && notification.isRead);
    
    return matchesSearch && matchesType && matchesRead;
  });

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

  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'contract_assigned':
        return 'Kontratë e caktuar';
      case 'payment_received':
        return 'Pagesë e marrë';
      case 'task_assigned':
        return 'Detyrë e caktuar';
      case 'work_hours_reminder':
        return 'Kujtesë orësh pune';
      case 'invoice_reminder':
        return 'Kujtesë faturash';
      case 'expense_reminder':
        return 'Kujtesë shpenzimesh';
      default:
        return 'Njoftim';
    }
  };

  const handleNotificationClick = (notification) => {
    // Navigo në faqen e duhur bazuar në rolin e përdoruesit
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <Bell size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Njoftimet</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full font-medium">
                {unreadCount} të palexuara
              </span>
            )}
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={() => {}}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Shëno të gjitha si të lexuara
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Kërko njoftime..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Të gjitha tipet</option>
              <option value="contract_assigned">Kontratat</option>
              <option value="payment_received">Pagesat</option>
              <option value="task_assigned">Detyrat</option>
              <option value="work_hours_reminder">Orët e punës</option>
              <option value="invoice_reminder">Faturat</option>
              <option value="expense_reminder">Shpenzimet</option>
            </select>

            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Të gjitha</option>
              <option value="unread">Të palexuara</option>
              <option value="read">Të lexuara</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Duke ngarkuar njoftimet...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nuk ka njoftime</h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all' || filterRead !== 'all' 
                ? 'Nuk u gjetën njoftime me filtrat e zgjedhur' 
                : 'Ju nuk keni njoftime për momentin'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-semibold ${
                        !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {getNotificationTypeLabel(notification.type)}
                      </span>
                      {!notification.isRead && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                          E re
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-2">{notification.message}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatTimeAgo(notification.createdAt)}</span>
                      <span>•</span>
                      <span>ID: {notification.id}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => {}}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                        title="Shëno si të lexuar"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      Shiko
                    </button>
                    
                    <button
                      onClick={() => {}}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Fshi njoftimin"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredNotifications.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Shfaqen {filteredNotifications.length} nga {notifications.length} njoftime
        </div>
      )}
    </div>
  );
};

export default NotificationsPage; 
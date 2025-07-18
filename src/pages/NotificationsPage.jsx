import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Search, Filter, Trash2, Check, CheckCheck, Download, FileText } from 'lucide-react';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Merr të gjitha njoftimet
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications');
      setNotifications(response.data);
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
      await api.patch('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setSelectedNotifications([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Gabim në shënimin e të gjitha si të lexuara:', error);
      // Nëse ka gabim, përditëso lokal state për UI
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setSelectedNotifications([]);
      setSelectAll(false);
    }
  };

  // Fshi njoftimin
  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
    } catch (error) {
      console.error('Gabim në fshirjen e njoftimit:', error);
    }
  };

  // Fshi njoftimet e zgjedhura
  const deleteSelected = async () => {
    try {
      await Promise.all(selectedNotifications.map(id => deleteNotification(id)));
      setSelectedNotifications([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Gabim në fshirjen e njoftimeve të zgjedhura:', error);
    }
  };

  // Eksporto njoftimet në CSV
  const exportToCSV = () => {
    const notificationsToExport = selectedNotifications.length > 0 
      ? notifications.filter(n => selectedNotifications.includes(n.id))
      : filteredNotifications;

    const headers = ['ID', 'Titulli', 'Mesazhi', 'Tipi', 'Kategoria', 'E lexuar', 'Data e krijimit'];
    const csvContent = [
      headers.join(','),
      ...notificationsToExport.map(n => [
        n.id,
        `"${n.title.replace(/"/g, '""')}"`,
        `"${n.message.replace(/"/g, '""')}"`,
        n.type,
        n.category || 'system',
        n.isRead ? 'Po' : 'Jo',
        new Date(n.createdAt).toLocaleString('sq-AL')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `njoftimet_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Eksporto njoftimet në PDF
  const exportToPDF = async () => {
    try {
      const notificationsToExport = selectedNotifications.length > 0 
        ? notifications.filter(n => selectedNotifications.includes(n.id))
        : filteredNotifications;

      // Krijo HTML content për PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #2563eb; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; }
              .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
              .read { background-color: #dcfce7; color: #166534; }
              .unread { background-color: #fef2f2; color: #dc2626; }
            </style>
          </head>
          <body>
            <h1>Raporti i Njoftimeve</h1>
            <p><strong>Përdoruesi:</strong> ${user?.email}</p>
            <p><strong>Data e gjenerimit:</strong> ${new Date().toLocaleString('sq-AL')}</p>
            <p><strong>Total njoftime:</strong> ${notificationsToExport.length}</p>
            
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Titulli</th>
                  <th>Mesazhi</th>
                  <th>Tipi</th>
                  <th>Statusi</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                ${notificationsToExport.map(n => `
                  <tr>
                    <td>${n.id}</td>
                    <td>${n.title}</td>
                    <td>${n.message}</td>
                    <td>${getNotificationTypeLabel(n.type)}</td>
                    <td><span class="status ${n.isRead ? 'read' : 'unread'}">${n.isRead ? 'E lexuar' : 'E palexuar'}</span></td>
                    <td>${new Date(n.createdAt).toLocaleString('sq-AL')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Përdor jsPDF për të krijuar PDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Konverto HTML në PDF
      doc.html(htmlContent, {
        callback: function (doc) {
          doc.save(`njoftimet_${new Date().toISOString().split('T')[0]}.pdf`);
        },
        x: 10,
        y: 10
      });
    } catch (error) {
      console.error('Gabim në eksportimin e PDF:', error);
      alert('Gabim në eksportimin e PDF. Provoni të eksportoni në CSV.');
    }
  };



  // Filtro njoftimet
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    
    const matchesRead = filterRead === 'all' || 
                       (filterRead === 'read' && notification.isRead) ||
                       (filterRead === 'unread' && !notification.isRead);
    
    return matchesSearch && matchesType && matchesRead;
  });

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications([]);
      setSelectAll(false);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
      setSelectAll(true);
    }
  };

  // Handle select individual
  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Tani';
    
    const now = new Date();
    const date = new Date(dateString);
    
    // Kontrollo nëse data është e vlefshme
    if (isNaN(date.getTime())) {
      console.log('Invalid date:', dateString);
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

  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'contract_assigned':
        return 'Kontratë e caktuar';
      case 'payment_received':
        return 'Pagesë e marrë';
      case 'task_assigned':
        return 'Detyrë e caktuar';
      case 'work_hours_reminder':
        return 'Kujtues orët e punës';
      case 'invoice_reminder':
        return 'Kujtues faturë';
      case 'expense_reminder':
        return 'Kujtues shpenzime';
      default:
        return 'Njoftim';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Bell size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Njoftimet</h1>
            <p className="text-gray-600">Menaxho të gjitha njoftimet tuaja</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Bell size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {notifications.filter(n => !n.isRead).length}
                </p>
                <p className="text-sm text-gray-600">Të palexuara</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {notifications.filter(n => n.isRead).length}
                </p>
                <p className="text-sm text-gray-600">Të lexuara</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Filter size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(notifications.map(n => n.type)).size}
                </p>
                <p className="text-sm text-gray-600">Lloje</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
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

          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Të gjitha llojet</option>
              <option value="contract_assigned">Kontratë e caktuar</option>
              <option value="payment_received">Pagesë e marrë</option>
              <option value="task_assigned">Detyrë e caktuar</option>
              <option value="work_hours_reminder">Kujtues orët e punës</option>
              <option value="invoice_reminder">Kujtues faturë</option>
              <option value="expense_reminder">Kujtues shpenzime</option>
            </select>

            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Të gjitha</option>
              <option value="unread">Të palexuara</option>
              <option value="read">Të lexuara</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {/* Export Buttons */}
            {filteredNotifications.length > 0 && (
              <>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  title="Eksporto në CSV"
                >
                  <Download size={16} />
                  CSV
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                  title="Eksporto në PDF"
                >
                  <FileText size={16} />
                  PDF
                </button>
              </>
            )}

            {selectedNotifications.length > 0 && (
              <button
                onClick={deleteSelected}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Fshi të zgjedhurat ({selectedNotifications.length})
              </button>
            )}
            
            {notifications.filter(n => !n.isRead).length > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <CheckCheck size={16} />
                Shëno të gjitha si të lexuara
              </button>
            )}

            {/* Test Email Notification Button */}
            <button
              onClick={async () => {
                try {
                  const response = await api.post('/api/notifications/test-email');
                  if (response.data.success) {
                    alert('✅ Njoftimi test u dërgua me sukses! Kontrolloni email-in tuaj.');
                  }
                } catch (error) {
                  console.error('Error testing email notification:', error);
                  alert('❌ Gabim në dërgimin e njoftimit test');
                }
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              📧 Test Email
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nuk ka njoftime</h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all' || filterRead !== 'all' 
                ? 'Provoni të ndryshoni filtrat për të parë më shumë rezultate'
                : 'Ju do të njoftoheni kur të ketë diçka të re'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-900">Njoftimi</span>
                <span className="font-semibold text-gray-900 ml-auto">Data</span>
                <span className="font-semibold text-gray-900 w-24 text-center">Veprime</span>
              </div>
            </div>

            {/* Notifications */}
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => handleSelectNotification(notification.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${!notification.isRead ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          title="Shëno si të lexuar"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
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
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage; 
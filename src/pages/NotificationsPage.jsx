import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Search, Filter, Trash2, Check, CheckCheck, Download, FileText } from 'lucide-react';
import api from '../api';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

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
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Titulli</th>
                  <th>Mesazhi</th>
                  <th>Tipi</th>
                  <th>Kategoria</th>
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
                    <td>${n.type}</td>
                    <td>${n.category || 'system'}</td>
                    <td><span class="status ${n.isRead ? 'read' : 'unread'}">${n.isRead ? 'E lexuar' : 'E palexuar'}</span></td>
                    <td>${new Date(n.createdAt).toLocaleString('sq-AL')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Krijo PDF
      const { jsPDF } = await import('jspdf');
      const { html2canvas } = await import('html2canvas');
      
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      document.body.appendChild(element);
      
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`njoftimet_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error testing email notification:', error);
      alert('❌ Gabim në dërgimin e njoftimit test');
    }
  };

  // Testo njoftimin me email
  const testEmailNotification = async () => {
    try {
      await api.post('/api/notifications/test-email', {
        email: user.email,
        title: 'Test Njoftim',
        message: 'Ky është një njoftim test për të verifikuar funksionimin e sistemit.'
      });
      alert('✅ Njoftimi test u dërgua me sukses!');
    } catch (error) {
      console.error('Error testing email notification:', error);
      alert('❌ Gabim në dërgimin e njoftimit test');
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

  // Handle select notification
  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Tani';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m më parë`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h më parë`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d më parë`;
    return date.toLocaleDateString('sq-AL');
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'payment': return '💰';
      case 'task': return '📝';
      case 'contract': return '📄';
      case 'employee': return '👷';
      default: return '🔔';
    }
  };

  // Get notification type label
  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'info': return 'Informacion';
      case 'success': return 'Sukses';
      case 'warning': return 'Paralajmërim';
      case 'error': return 'Gabim';
      case 'payment': return 'Pagesë';
      case 'task': return 'Detyrë';
      case 'contract': return 'Kontratë';
      case 'employee': return 'Punonjës';
      default: return 'Sistem';
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🔔 Njoftimet
        </h1>
        <p className="text-gray-600">
          Menaxhoni të gjitha njoftimet e sistemit
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Kërko njoftime..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Të gjitha tipet</option>
              <option value="info">Informacion</option>
              <option value="success">Sukses</option>
              <option value="warning">Paralajmërim</option>
              <option value="error">Gabim</option>
              <option value="payment">Pagesë</option>
              <option value="task">Detyrë</option>
              <option value="contract">Kontratë</option>
              <option value="employee">Punonjës</option>
            </select>

            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Të gjitha</option>
              <option value="read">E lexuara</option>
              <option value="unread">E palexuara</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {selectedNotifications.length > 0 && (
              <>
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                  Fshi të zgjedhurat ({selectedNotifications.length})
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={16} />
                  Eksporto CSV
                </button>
              </>
            )}
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText size={16} />
              Eksporto PDF
            </button>
            <button
              onClick={testEmailNotification}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Bell size={16} />
              Test Email
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Njoftimet ({filteredNotifications.length})
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Zgjidh të gjitha</span>
              </label>
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
              >
                <CheckCheck size={16} />
                Shëno të gjitha si të lexuara
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">Nuk ka njoftime për të shfaqur</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => handleSelectNotification(notification.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          notification.isRead 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {notification.isRead ? 'E lexuar' : 'E palexuar'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                        {notification.category && (
                          <span>Kategoria: {notification.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Check size={16} />
                        Shëno si të lexuar
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={16} />
                      Fshi
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage; 
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Search, Filter, Trash2, Check, CheckCheck, Download, FileText } from 'lucide-react';
import api from '../api';
import { useTranslation } from 'react-i18next';

const NotificationsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Safe translation function with fallback
  const safeT = (key, fallback = key) => {
    try {
      const result = t(key);
      return result && result !== key ? result : fallback;
    } catch (error) {
      console.error(`Translation error for key "${key}":`, error);
      return fallback;
    }
  };
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
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
      console.error(safeT('notifications.messages.deleteSelectedError', 'Gabim në fshirjen e njoftimeve të zgjedhura:'), error);
    }
  };

  // Eksporto njoftimet në CSV
  const exportToCSV = () => {
    const notificationsToExport = selectedNotifications.length > 0 
      ? notifications.filter(n => selectedNotifications.includes(n.id))
      : filteredNotifications;

    const headers = safeT('notifications.export.csvHeaders', ['ID', 'Titulli', 'Mesazhi', 'Tipi', 'Kategoria', 'E lexuar', 'Data e krijimit']);
    const csvContent = [
      headers.join(','),
      ...notificationsToExport.map(n => [
        n.id,
        `"${n.title.replace(/"/g, '""')}"`,
        `"${n.message.replace(/"/g, '""')}"`,
        n.type,
        n.category || 'system',
        n.isRead ? safeT('notifications.status.read', 'Po') : safeT('notifications.status.unread', 'Jo'),
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
            <h1>{safeT('notifications.export.pdfTitle', 'Raporti i Njoftimeve')}</h1>
            <table>
              <thead>
                <tr>
                  <th>{safeT('notifications.export.pdfHeaders.0', 'ID')}</th>
                  <th>{safeT('notifications.export.pdfHeaders.1', 'Titulli')}</th>
                  <th>{safeT('notifications.export.pdfHeaders.2', 'Mesazhi')}</th>
                  <th>{safeT('notifications.export.pdfHeaders.3', 'Tipi')}</th>
                  <th>{safeT('notifications.export.pdfHeaders.4', 'Kategoria')}</th>
                  <th>{safeT('notifications.export.pdfHeaders.5', 'Statusi')}</th>
                  <th>{safeT('notifications.export.pdfHeaders.6', 'Data')}</th>
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
                    <td><span class="status ${n.isRead ? 'read' : 'unread'}">${n.isRead ? safeT('notifications.status.read', 'E lexuar') : safeT('notifications.status.unread', 'E palexuar')}</span></td>
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
      alert(`❌ ${safeT('notifications.messages.testEmailError', 'Gabim në dërgimin e njoftimit test')}`);
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
      alert(`✅ ${safeT('notifications.messages.testEmailSuccess', 'Njoftimi test u dërgua me sukses!')}`);
    } catch (error) {
      console.error('Error testing email notification:', error);
      alert(`❌ ${safeT('notifications.messages.testEmailError', 'Gabim në dërgimin e njoftimit test')}`);
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
    
    if (diffInSeconds < 60) return safeT('notifications.timeAgo.now', 'Tani');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${safeT('notifications.timeAgo.minutesAgo', 'm më parë')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${safeT('notifications.timeAgo.hoursAgo', 'h më parë')}`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}${safeT('notifications.timeAgo.daysAgo', 'd më parë')}`;
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
      case 'info': return safeT('notifications.types.info', 'Informacion');
      case 'success': return safeT('notifications.types.success', 'Sukses');
      case 'warning': return safeT('notifications.types.warning', 'Paralajmërim');
      case 'error': return safeT('notifications.types.error', 'Gabim');
      case 'payment': return safeT('notifications.types.payment', 'Pagesë');
      case 'task': return safeT('notifications.types.task', 'Detyrë');
      case 'contract': return safeT('notifications.types.contract', 'Kontratë');
      case 'employee': return safeT('notifications.types.employee', 'Punonjës');
      default: return safeT('notifications.types.system', 'Sistem');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">{safeT('notifications.loading', 'Duke ngarkuar njoftimet...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#32938b]/5 via-white to-[#2a6b66]/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10 rounded-2xl shadow-lg p-8 mb-8 border border-[#32938b]/20">
          <div className="flex items-center gap-4">
            <div className="bg-[#32938b]/10 rounded-xl p-3 shadow-sm">
              <span className="text-3xl">🔔</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#32938b] to-[#2a6b66] mb-2">
                {safeT('notifications.title', 'Njoftimet')}
              </h1>
              <p className="text-lg text-[#2a6b66]/80">
                {safeT('notifications.subtitle', 'Menaxhoni të gjitha njoftimet e sistemit')}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-[#32938b]/20">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#32938b]" size={20} />
                <input
                  type="text"
                  placeholder={safeT('notifications.searchPlaceholder', 'Kërko njoftime...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#32938b]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-colors"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 border border-[#32938b]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-colors"
              >
                <option value="all">{safeT('notifications.allTypes', 'Të gjitha tipet')}</option>
                <option value="info">{safeT('notifications.types.info', 'Informacion')}</option>
                <option value="success">{safeT('notifications.types.success', 'Sukses')}</option>
                <option value="warning">{safeT('notifications.types.warning', 'Paralajmërim')}</option>
                <option value="error">{safeT('notifications.types.error', 'Gabim')}</option>
                <option value="payment">{safeT('notifications.types.payment', 'Pagesë')}</option>
                <option value="task">{safeT('notifications.types.task', 'Detyrë')}</option>
                <option value="contract">{safeT('notifications.types.contract', 'Kontratë')}</option>
                <option value="employee">{safeT('notifications.types.employee', 'Punonjës')}</option>
              </select>

              <select
                value={filterRead}
                onChange={(e) => setFilterRead(e.target.value)}
                className="px-4 py-3 border border-[#32938b]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-colors"
              >
                <option value="all">{safeT('notifications.all', 'Të gjitha')}</option>
                <option value="read">{safeT('notifications.read', 'E lexuara')}</option>
                <option value="unread">{safeT('notifications.unread', 'E palexuara')}</option>
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
                    {safeT('notifications.deleteSelected', 'Fshi të zgjedhurat')} ({selectedNotifications.length})
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-[#32938b] text-white rounded-lg hover:bg-[#2a6b66] transition-colors"
                  >
                    <Download size={16} />
                    {safeT('notifications.exportCSV', 'Eksporto CSV')}
                  </button>
                </>
              )}
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FileText size={16} />
                {safeT('notifications.exportPDF', 'Eksporto PDF')}
              </button>
              <button
                onClick={testEmailNotification}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a6b66] text-white rounded-lg hover:bg-[#1c514f] transition-colors"
              >
                <Bell size={16} />
                {safeT('notifications.testEmail', 'Test Email')}
              </button>
            </div>
        </div>
      </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-lg border border-[#32938b]/20">
          <div className="p-6 border-b border-[#32938b]/20 bg-gradient-to-r from-[#32938b]/5 to-[#2a6b66]/5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#32938b]">
                {safeT('notifications.notifications', 'Njoftimet')} ({filteredNotifications.length})
              </h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-[#32938b]/30 text-[#32938b] focus:ring-[#32938b]"
                  />
                  <span className="text-sm text-[#2a6b66]">{safeT('notifications.selectAll', 'Zgjidh të gjitha')}</span>
                </label>
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-[#32938b]/10 text-[#32938b] rounded-lg hover:bg-[#32938b]/20 transition-colors"
                >
                  <CheckCheck size={16} />
                  {safeT('notifications.markAllAsRead', 'Shëno të gjitha si të lexuara')}
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#32938b]/10">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto text-[#32938b]/40 mb-4" size={48} />
                <p className="text-[#2a6b66]/60">{safeT('notifications.noNotifications', 'Nuk ka njoftime për të shfaqur')}</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-[#32938b]/5 transition-colors ${
                    !notification.isRead ? 'bg-[#32938b]/10' : ''
                  }`}
                >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => handleSelectNotification(notification.id)}
                      className="rounded border-[#32938b]/30 text-[#32938b] focus:ring-[#32938b]"
                    />
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-[#2a6b66]">{notification.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          notification.isRead 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {notification.isRead ? safeT('notifications.status.read', 'E lexuar') : safeT('notifications.status.unread', 'E palexuar')}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#32938b]/10 text-[#32938b]">
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                      </div>
                      <p className="text-[#2a6b66]/80 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-sm text-[#32938b]/60">
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                        {notification.category && (
                          <span>{safeT('notifications.category', 'Kategoria')}: {notification.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-[#32938b]/10 text-[#32938b] rounded-lg hover:bg-[#32938b]/20 transition-colors"
                      >
                        <Check size={16} />
                        {safeT('notifications.markAsRead', 'Shëno si të lexuar')}
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={16} />
                      {safeT('notifications.delete', 'Fshi')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage; 
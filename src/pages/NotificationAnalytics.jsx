import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Bell, 
  Mail, 
  Clock, 
  AlertTriangle,
  FileText,
  DollarSign,
  Settings,
  Calendar,
  Activity
} from 'lucide-react';
import api from '../api';

const NotificationAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalNotifications: 0,
    unreadNotifications: 0,
    readNotifications: 0,
    emailSent: 0,
    emailFailed: 0,
    notificationsByType: {},
    notificationsByRole: {},
    notificationsByDay: [],
    engagementRate: 0,
    averageResponseTime: 0,
    topNotificationTypes: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d

  // Merr analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/notifications/analytics?range=${dateRange}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Gabim në marrjen e analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getNotificationTypeIcon = (type) => {
    switch (type) {
      case 'contract': return <FileText size={20} className="text-blue-600" />;
      case 'payment': return <DollarSign size={20} className="text-green-600" />;
      case 'task': return <Clock size={20} className="text-purple-600" />;
      case 'work_hours': return <Activity size={20} className="text-orange-600" />;
      case 'system': return <Settings size={20} className="text-gray-600" />;
      case 'reminder': return <AlertTriangle size={20} className="text-red-600" />;
      default: return <Bell size={20} className="text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'contract': return 'Kontratat';
      case 'payment': return 'Pagesat';
      case 'task': return 'Detyrat';
      case 'work_hours': return 'Orët e punës';
      case 'system': return 'Sistemi';
      case 'reminder': return 'Kujtues';
      default: return type;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <BarChart3 size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics i Njoftimeve</h1>
            <p className="text-gray-600">Statistikat dhe insights për sistemin e njoftimeve</p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Periudha:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">7 ditët e fundit</option>
            <option value="30d">30 ditët e fundit</option>
            <option value="90d">90 ditët e fundit</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Njoftime</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalNotifications}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bell size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Të Palexuara</p>
              <p className="text-3xl font-bold text-red-600">{analytics.unreadNotifications}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Email të Dërguar</p>
              <p className="text-3xl font-bold text-green-600">{analytics.emailSent}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Mail size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Engagement Rate</p>
              <p className="text-3xl font-bold text-purple-600">{analytics.engagementRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notifications by Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Njoftimet sipas Tipit</h2>
          <div className="space-y-4">
            {Object.entries(analytics.notificationsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  {getNotificationTypeIcon(type)}
                  <div>
                    <p className="font-medium text-gray-900">{getNotificationTypeLabel(type)}</p>
                    <p className="text-sm text-gray-600">{count} njoftime</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600">
                    {((count / analytics.totalNotifications) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications by Role */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Njoftimet sipas Rolit</h2>
          <div className="space-y-4">
            {Object.entries(analytics.notificationsByRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Users size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{role}</p>
                    <p className="text-sm text-gray-600">{count} njoftime</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600">
                    {((count / analytics.totalNotifications) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Aktiviteti Ditor</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {analytics.notificationsByDay.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                style={{ height: `${(day.count / Math.max(...analytics.notificationsByDay.map(d => d.count))) * 200}px` }}
              ></div>
              <p className="text-xs text-gray-600 mt-2">{day.date}</p>
              <p className="text-xs font-medium text-gray-900">{day.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Notification Types */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Llojet më të Popullarizuara</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.topNotificationTypes.map((type, index) => (
            <div key={type.name} className="p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                {getNotificationTypeIcon(type.name)}
                <span className="font-medium text-gray-900">{getNotificationTypeLabel(type.name)}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{type.count}</p>
              <p className="text-sm text-gray-600">{type.percentage}% e totalit</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Aktiviteti i Fundit</h2>
        <div className="space-y-4">
          {analytics.recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{activity.time}</p>
                <p className="text-xs text-gray-600">{activity.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performanca</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Koha mesatare e përgjigjes</span>
              <span className="font-semibold text-gray-900">{analytics.averageResponseTime} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Email të dështuar</span>
              <span className="font-semibold text-red-600">{analytics.emailFailed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Suksesi i email-ve</span>
              <span className="font-semibold text-green-600">
                {analytics.emailSent > 0 ? ((analytics.emailSent / (analytics.emailSent + analytics.emailFailed)) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Insights</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Insight:</strong> {analytics.topNotificationTypes[0]?.name} është lloji më i popullarizuar i njoftimit.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>✅ Sukses:</strong> Engagement rate është {analytics.engagementRate}%, që tregon përdorim të mirë të sistemit.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>⚠️ Vëmendje:</strong> {analytics.unreadNotifications} njoftime janë ende të palexuara.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationAnalytics;
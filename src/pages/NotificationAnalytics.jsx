import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Activity,
  RefreshCw,
  Download,
  Filter,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import api from '../api';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PageLoader from '../components/ui/PageLoader';

// Color palette for charts
const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'
];

const NotificationAnalytics = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // Safe translation function with fallback
  const safeT = (key, fallback = key) => {
    try {
      const result = t(key);
      return result && result !== key ? result : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('7d');
  const [showDetails, setShowDetails] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const response = await api.get('/notifications/analytics', {
        params: { range: dateRange }
      });
      
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchAnalytics();
    }
  }, [user?.token, dateRange]);

  // Prepare chart data
  const prepareChartData = () => {
    if (!analytics) return { dailyData: [], typeData: [], roleData: [] };

    const dailyData = analytics.dailyNotifications?.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      notifications: item.count,
      read: item.readCount || 0,
      unread: item.unreadCount || 0
    })) || [];

    const typeData = analytics.notificationTypes?.map((type, index) => ({
      name: getNotificationTypeLabel(type.name),
      value: type.count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    })) || [];

    const roleData = analytics.roleDistribution?.map((role, index) => ({
      name: role.role,
      value: role.count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    })) || [];

    return { dailyData, typeData, roleData };
  };

  // Get notification type label
  const getNotificationTypeLabel = (type) => {
    const labels = {
      'task_assigned': safeT('analytics.types.taskAssigned', 'Task Assigned'),
      'task_completed': safeT('analytics.types.taskCompleted', 'Task Completed'),
      'payment_processed': safeT('analytics.types.paymentProcessed', 'Payment Processed'),
      'contract_updated': safeT('analytics.types.contractUpdated', 'Contract Updated'),
      'work_hours_logged': safeT('analytics.types.workHoursLogged', 'Work Hours Logged'),
      'system_alert': safeT('analytics.types.systemAlert', 'System Alert'),
      'reminder': safeT('analytics.types.reminder', 'Reminder'),
      'announcement': safeT('analytics.types.announcement', 'Announcement')
    };
    return labels[type] || type;
  };

  // Format number with locale
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Calculate percentage change
  const getPercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchAnalytics();
  };

  // Handle export
  const handleExport = () => {
    if (!analytics) return;
    
    const data = {
      summary: {
        totalNotifications: analytics.totalNotifications,
        unreadNotifications: analytics.unreadNotifications,
        engagementRate: analytics.engagementRate,
        averageResponseTime: analytics.averageResponseTime
      },
      dailyData: analytics.dailyNotifications,
      typeData: analytics.notificationTypes,
      roleData: analytics.roleDistribution
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notification-analytics-${dateRange}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">{safeT('analytics.error', 'Gabim')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={handleRefresh} className="bg-red-500 hover:bg-red-600">
            <RefreshCw className="w-4 h-4 mr-2" />
            {safeT('analytics.retry', 'Provo Përsëri')}
          </Button>
        </div>
      </div>
    );
  }

  const { dailyData, typeData, roleData } = prepareChartData();

  return (
    <div className="w-full px-4 md:px-6 py-4 md:py-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                {safeT('analytics.title', 'Analytics i Njoftimeve')}
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                {safeT('analytics.subtitle', 'Statistikat dhe insights për sistemin e njoftimeve')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">{safeT('analytics.last7Days', '7 Ditët e Fundit')}</option>
              <option value="30d">{safeT('analytics.last30Days', '30 Ditët e Fundit')}</option>
              <option value="90d">{safeT('analytics.last90Days', '90 Ditët e Fundit')}</option>
            </select>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {safeT('analytics.refresh', 'Rifresko')}
            </Button>
            <Button
              onClick={handleExport}
              className="bg-green-500 hover:bg-green-600"
            >
              <Download className="w-4 h-4 mr-2" />
              {safeT('analytics.export', 'Eksporto')}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">{safeT('analytics.totalNotifications', 'Njoftime Total')}</p>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(analytics?.totalNotifications || 0)}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">{safeT('analytics.engagementRate', 'Engagement Rate')}</p>
                <p className="text-2xl font-bold text-green-900">{analytics?.engagementRate || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">{safeT('analytics.unreadNotifications', 'Njoftime të Palexuara')}</p>
                <p className="text-2xl font-bold text-orange-900">{formatNumber(analytics?.unreadNotifications || 0)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">{safeT('analytics.averageResponseTime', 'Koha Mesatare e Përgjigjes')}</p>
                <p className="text-2xl font-bold text-purple-900">{analytics?.averageResponseTime || 0}h</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Notifications Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {safeT('analytics.dailyNotifications', 'Njoftime Ditore')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="notifications"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Notification Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              {safeT('analytics.notificationTypes', 'Llojet e Njoftimeve')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {safeT('analytics.roleDistribution', 'Shpërndarja sipas Roleve')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Insights Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {safeT('analytics.insights', 'Insights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>📊</strong> {analytics?.topNotificationTypes && analytics.topNotificationTypes.length > 0 ? 
                  `${getNotificationTypeLabel(analytics.topNotificationTypes[0].name)} ${safeT('analytics.insights.mostPopular', 'është lloji më i popullarizuar')}` : 
                  safeT('analytics.insights.systemWorkingWell', 'Sistemi po funksionon mirë')}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>✅</strong> {safeT('analytics.insights.engagementRate', 'Engagement rate është')} {analytics?.engagementRate || 0}%
              </p>
            </div>
            {analytics?.unreadNotifications > 0 && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>⚠️</strong> {analytics.unreadNotifications} {safeT('analytics.insights.notificationsUnread', 'njoftime janë ende të palexuara')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationAnalytics;
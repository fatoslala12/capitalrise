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
      console.error(`Translation error for key "${key}":`, error);
      return fallback;
    }
  };
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
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/notifications/test-analytics?range=${dateRange}`);
      
      if (response.data.success) {
        setAnalytics(response.data.data);
      } else {
        throw new Error(response.data.error || safeT('analytics.messages.dataLoadError', 'Gabim në marrjen e të dhënave'));
      }
    } catch (error) {
      console.error('Gabim në marrjen e analytics:', error);
      setError(error.message || safeT('analytics.messages.dataLoadError', 'Gabim në marrjen e analytics'));
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, refreshKey]);

  // Get notification type icon
  const getNotificationTypeIcon = (type) => {
    const icons = {
      'contract': <FileText size={20} className="text-blue-600" />,
      'payment': <DollarSign size={20} className="text-green-600" />,
      'task': <Clock size={20} className="text-purple-600" />,
      'work_hours': <Activity size={20} className="text-orange-600" />,
      'system': <Settings size={20} className="text-gray-600" />,
      'reminder': <AlertTriangle size={20} className="text-red-600" />,
      'alert': <AlertTriangle size={20} className="text-red-600" />,
      'info': <Info size={20} className="text-blue-600" />
    };
    return icons[type] || <Bell size={20} className="text-gray-600" />;
  };

  // Get notification type label
  const getNotificationTypeLabel = (type) => {
    const labels = {
      'contract': safeT('analytics.notificationTypes.contracts', 'Kontratat'),
      'payment': safeT('analytics.notificationTypes.payments', 'Pagesat'),
      'task': safeT('analytics.notificationTypes.tasks', 'Detyrat'),
      'work_hours': safeT('analytics.notificationTypes.workHours', 'Orët e punës'),
      'system': safeT('analytics.notificationTypes.system', 'Sistemi'),
      'reminder': safeT('analytics.notificationTypes.reminder', 'Kujtues'),
      'alert': safeT('analytics.notificationTypes.alert', 'Alarm'),
      'info': safeT('analytics.notificationTypes.info', 'Informacion')
    };
    return labels[type] || type;
  };

  // Prepare data for charts
  const prepareChartData = () => {
    // Daily activity data
    const dailyData = analytics.notificationsByDay.map(day => ({
      date: day.date,
      count: day.count,
      unread: Math.floor(day.count * (analytics.unreadNotifications / analytics.totalNotifications))
    }));

    // Type distribution data
    const typeData = Object.entries(analytics.notificationsByType).map(([type, count], index) => ({
      name: getNotificationTypeLabel(type),
      value: count,
      type: type,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));

    // Role distribution data
    const roleData = Object.entries(analytics.notificationsByRole).map(([role, count], index) => ({
      name: role || 'Pa rol',
      value: count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));

    return { dailyData, typeData, roleData };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner fullScreen={true} size="xl" text={safeT('analytics.loading', null)} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">{safeT('analytics.error', 'Gabim')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={refreshData} className="bg-red-600 hover:bg-red-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            {safeT('analytics.tryAgain', 'Provoni përsëri')}
          </Button>
        </div>
      </div>
    );
  }

  const { dailyData, typeData, roleData } = prepareChartData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
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
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  variant={showUnreadOnly ? "primary" : "outline"}
                  size="sm"
                >
                  {showUnreadOnly ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showUnreadOnly ? safeT('analytics.all', 'Të gjitha') : safeT('analytics.unreadOnly', 'Vetëm të palexuara')}
                </Button>
              </div>
              
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1d">{safeT('analytics.dateRanges.1d', '1 Ditë')}</option>
                <option value="7d">{safeT('analytics.dateRanges.7d', '7 Ditë')}</option>
                <option value="30d">{safeT('analytics.dateRanges.30d', '30 Ditë')}</option>
                <option value="90d">{safeT('analytics.dateRanges.90d', '90 Ditë')}</option>
              </select>
              
              <Button onClick={refreshData} variant="outline" size="sm">
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">{safeT('analytics.metrics.totalNotifications', 'Total Njoftime')}</p>
                  <p className="text-3xl font-bold text-blue-900">{analytics.totalNotifications}</p>
                  <p className="text-xs text-blue-600 mt-1">{safeT('analytics.metrics.total', 'Gjithsej')}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-full">
                  <Bell className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">{safeT('analytics.metrics.read', 'Të Lexuara')}</p>
                  <p className="text-3xl font-bold text-green-900">{analytics.readNotifications}</p>
                  <p className="text-xs text-green-600 mt-1">{safeT('analytics.metrics.success', 'Sukses')}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">{safeT('analytics.metrics.unread', 'Të Palexuara')}</p>
                  <p className="text-3xl font-bold text-yellow-900">{analytics.unreadNotifications}</p>
                  <p className="text-xs text-yellow-600 mt-1">{safeT('analytics.metrics.needAttention', 'Kërkojnë vëmendje')}</p>
                </div>
                <div className="p-3 bg-yellow-200 rounded-full">
                  <EyeOff className="w-6 h-6 text-yellow-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">{safeT('analytics.metrics.engagement', 'Engagement')}</p>
                  <p className="text-3xl font-bold text-purple-900">{analytics.engagementRate}%</p>
                  <p className="text-xs text-purple-600 mt-1">{safeT('analytics.metrics.rate', 'Rate')}</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Activity Chart */}
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <TrendingUp className="w-5 h-5" />
                {safeT('analytics.charts.dailyActivity', 'Aktiviteti Ditor')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name={safeT('analytics.chartLabels.total', 'Total')} />
                  <Bar dataKey="unread" fill="#f59e0b" radius={[4, 4, 0, 0]} name={safeT('analytics.chartLabels.unread', 'Të palexuara')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Type Distribution Chart */}
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <PieChart className="w-5 h-5" />
                {safeT('analytics.charts.typeDistribution', 'Shpërndarja sipas Llojit')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value}`}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Notification Types */}
        <Card className="mb-8 border-2 border-gray-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <BarChart3 className="w-5 h-5" />
              {safeT('analytics.charts.popularTypes', 'Llojet më të Popullarizuara')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {analytics.topNotificationTypes.map((type, index) => (
                <div key={type.name} className="group relative">
                  <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 rounded-xl border border-blue-200 hover:border-blue-400 transition-all duration-300 hover:shadow-lg cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{getNotificationTypeIcon(type.name)}</span>
                      <div className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-700 mb-1">
                        {type.count}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">
                        {getNotificationTypeLabel(type.name)}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {type.percentage}% {safeT('analytics.chartLabels.percentageOfTotal', 'e totalit')}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Activity */}
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
              <CardTitle className="flex items-center gap-2 text-indigo-800">
                <Activity className="w-5 h-5" />
                {safeT('analytics.charts.recentActivity', 'Aktiviteti i Fundit')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {analytics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                      <Calendar size={16} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{activity.action}</p>
                      <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{activity.time}</span>
                        <span className="text-xs text-indigo-600 font-medium">{activity.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Settings className="w-5 h-5" />
                {safeT('analytics.charts.performance', 'Performanca & Insights')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Email Performance */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">{safeT('analytics.performance.emailPerformance', 'Performanca e Email-ve')}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                                              <span className="text-gray-600">{safeT('analytics.performance.emailsSent', 'Email të dërguar')}</span>
                        <span className="font-semibold text-green-600">{analytics.emailSent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">{safeT('analytics.performance.emailsFailed', 'Email të dështuar')}</span>
                        <span className="font-semibold text-red-600">{analytics.emailFailed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">{safeT('analytics.performance.success', 'Suksesi')}</span>
                      <span className="font-semibold text-green-600">
                        {analytics.emailSent > 0 ? ((analytics.emailSent / (analytics.emailSent + analytics.emailFailed)) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Response Time */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">{safeT('analytics.performance.responseTime', 'Koha e Përgjigjes')}</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">{analytics.averageResponseTime}</span>
                    <span className="text-gray-600">{safeT('analytics.performance.averageMinutes', 'min mesatarisht')}</span>
                  </div>
                </div>

                {/* Insights */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">{safeT('analytics.performance.insights', 'Insights')}</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 rounded-lg">
                                              <p className="text-sm text-blue-800">
                          <strong>💡</strong> {analytics.topNotificationTypes[0]?.name ? 
                            `${getNotificationTypeLabel(analytics.topNotificationTypes[0].name)} ${safeT('analytics.insights.mostPopular', 'është lloji më i popullarizuar')}` : 
                            safeT('analytics.insights.systemWorkingWell', 'Sistemi po funksionon mirë')}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>✅</strong> {safeT('analytics.insights.engagementRate', 'Engagement rate është')} {analytics.engagementRate}%
                        </p>
                      </div>
                      {analytics.unreadNotifications > 0 && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-sm text-orange-800">
                            <strong>⚠️</strong> {analytics.unreadNotifications} {safeT('analytics.insights.notificationsUnread', 'njoftime janë ende të palexuara')}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationAnalytics;
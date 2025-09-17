import { useState, useEffect, useCallback } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { sq } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import api from "../api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLoader from "../components/ui/PageLoader";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Container, Grid } from "../components/ui/Layout";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  AreaChart, Area, Legend
} from "recharts";
import { 
  Search, Filter, Download, RefreshCw, Eye, 
  AlertTriangle, TrendingUp, Users, Activity,
  Calendar, Clock, User, Shield, Database,
  Plus, Edit, Trash2, LogIn, CreditCard, Upload, RotateCcw,
  XCircle, CheckCircle, AlertCircle, Info
} from "lucide-react";

// Global color palette for charts - Green theme
const CHART_COLORS = ["#32938b", "#2a6b66", "#1c514f", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

export default function AuditTrail() {
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
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [mostActiveEntities, setMostActiveEntities] = useState([]);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    action: "",
    user: "",
    dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    module: "",
    severity: "",
    limit: 100
  });

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    ipAddress: "",
    entityType: "",
    entityId: "",
    hasChanges: false,
    timeRange: "7d" // 1d, 7d, 30d, 90d, custom
  });

  useEffect(() => {
    fetchData();
    if (!realTimeMode) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [realTimeMode]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      const [logsRes, statsRes] = await Promise.all([
        api.get('/api/audit-trail', { params }),
        api.get('/api/audit-trail/stats', { params })
      ]);
      const payload = logsRes.data?.logs || logsRes.data?.data || [];
      setAuditLogs(payload);
      if (statsRes.data?.data) setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      toast.error(safeT('auditTrail.messages.dataLoadError', 'Gabim gjatë ngarkimit të të dhënave'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Apliko filtra
  const applyFilters = () => {
    fetchData();
  };

  // Reset filtra
  const resetFilters = () => {
    setFilters({
      action: '',
      user: '',
      dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd'),
      module: '',
      severity: '',
      limit: 100
    });
    setAdvancedFilters({
      ipAddress: '',
      entityType: '',
      entityId: '',
      hasChanges: false,
      timeRange: '7d'
    });
    fetchData();
  };

  // Filtro log-et
  const filteredLogs = auditLogs.filter(log => {
    if (filters.action && log.action !== filters.action) return false;
    if (filters.user && !log.user_name?.toLowerCase().includes(filters.user.toLowerCase())) return false;
    if (filters.module && log.module !== filters.module) return false;
    if (filters.severity && log.severity !== filters.severity) return false;
    
    if (filters.dateFrom || filters.dateTo) {
      const logDate = new Date(log.timestamp);
      if (filters.dateFrom && logDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && logDate > new Date(filters.dateTo)) return false;
    }
    
    return true;
  });

  // Funksionet për ikonat dhe ngjyrat
  const getModuleIcon = (module) => {
    const icons = {
      'CONTRACTS': '📄',
      'EMPLOYEES': '👷',
      'TASKS': '📋',
      'AUTH': '🔐',
      'PAYMENTS': '💰',
      'REPORTS': '📊',
      'SETTINGS': '⚙️',
      'BACKUP': '🗄️',
      'USERS': '👥',
      'WORK_HOURS': '🕒',
      'EXPENSES': '💸',
      'INVOICES': '🧾',
      'NOTIFICATIONS': '🔔'
    };
    return icons[module] || '📋';
  };

  const getActionColor = (action) => {
    const colors = {
      'CREATE': 'bg-green-100 text-green-800 border-green-200',
      'UPDATE': 'bg-blue-100 text-blue-800 border-blue-200',
      'DELETE': 'bg-red-100 text-red-800 border-red-200',
      'LOGIN': 'bg-purple-100 text-purple-800 border-purple-200',
      'LOGIN_SUCCESS': 'bg-green-100 text-green-800 border-green-200',
      'LOGIN_FAILED': 'bg-red-100 text-red-800 border-red-200',
      'PAYMENT': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'EXPORT': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'IMPORT': 'bg-orange-100 text-orange-800 border-orange-200',
      'BACKUP': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'RESTORE': 'bg-pink-100 text-pink-800 border-pink-200'
    };
    return colors[action] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getModuleColor = (module) => {
    const colors = {
      'CONTRACTS': 'text-blue-600',
      'EMPLOYEES': 'text-green-600',
      'TASKS': 'text-purple-600',
      'AUTH': 'text-red-600',
      'PAYMENTS': 'text-yellow-600',
      'REPORTS': 'text-indigo-600',
      'SETTINGS': 'text-gray-600',
      'BACKUP': 'text-cyan-600'
    };
    return colors[module] || 'text-gray-600';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      'LOW': <Info className="w-4 h-4 text-blue-500" />,
      'MEDIUM': <AlertCircle className="w-4 h-4 text-yellow-500" />,
      'HIGH': <AlertTriangle className="w-4 h-4 text-orange-500" />,
      'CRITICAL': <XCircle className="w-4 h-4 text-red-500" />
    };
    return icons[severity] || <Info className="w-4 h-4 text-gray-500" />;
  };

  // Generate daily activity data for chart
  const generateDailyActivityData = () => {
    if (!auditLogs || auditLogs.length === 0) return [];
    
    const dailyData = {};
    const startDate = new Date(filters.dateFrom);
    const endDate = new Date(filters.dateTo);
    
    // Initialize all dates in range with 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailyData[format(d, 'dd MMM')] = 0;
    }
    
    // Count activities for each date
    auditLogs.forEach(log => {
      const date = format(new Date(log.timestamp), 'dd MMM');
      if (dailyData.hasOwnProperty(date)) {
        dailyData[date]++;
      }
    });
    
    // Only return dates that have activities (count > 0)
    return Object.entries(dailyData)
      .filter(([date, count]) => count > 0)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        // Sort by actual date, not by formatted string
        const dateA = new Date(a.date + ' ' + new Date().getFullYear());
        const dateB = new Date(b.date + ' ' + new Date().getFullYear());
        return dateA - dateB;
      });
  };

  // Generate activity distribution data for pie chart
  const generateActivityDistributionData = () => {
    if (!auditLogs || auditLogs.length === 0) return [];
    
    const actionCounts = {};
    auditLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });
    
    return Object.entries(actionCounts)
      .map(([action, count], index) => ({
        name: action,
        value: count,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  };

  if (loading) {
    return <PageLoader text="Duke ngarkuar audit trail..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">{safeT('auditTrail.error', 'Gabim')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
            {safeT('auditTrail.tryAgain', 'Provoni përsëri')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#32938b]/5 via-white to-[#2a6b66]/5">
      <Container>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#32938b] to-[#2a6b66] mb-2">🔍 {safeT('auditTrail.title', 'Audit Trail')}</h1>
          <p className="text-[#2a6b66]/80 text-lg">{safeT('auditTrail.subtitle', 'Monitorimi i të gjitha aktiviteteve në sistem')}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#32938b]/10 to-[#32938b]/20 border-[#32938b]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#32938b] mb-1">{safeT('auditTrail.totalActivities', 'Total Aktivitetet')}</p>
                  <p className="text-3xl font-bold text-[#2a6b66]">{stats.totalLogs || 0}</p>
                  <p className="text-xs text-[#32938b] mt-1">{safeT('auditTrail.total', 'Gjithsej')}</p>
                </div>
                <div className="p-3 bg-[#32938b]/20 rounded-full">
                  <Activity className="w-6 h-6 text-[#32938b]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">{safeT('auditTrail.todayActivities', 'Aktivitetet Sot')}</p>
                  <p className="text-3xl font-bold text-emerald-900">{stats.todayLogs || 0}</p>
                  <p className="text-xs text-emerald-600 mt-1">{safeT('auditTrail.today', 'Këtë ditë')}</p>
                </div>
                <div className="p-3 bg-emerald-200 rounded-full">
                  <Calendar className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#2a6b66]/10 to-[#2a6b66]/20 border-[#2a6b66]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#2a6b66] mb-1">{safeT('auditTrail.failedLogins', 'Kyçje të Dështuara')}</p>
                  <p className="text-3xl font-bold text-[#1c514f]">
                    {stats.actionStats?.find(s => s.action === 'LOGIN_FAILED')?.count || 0}
                  </p>
                  <p className="text-xs text-[#2a6b66] mt-1">{safeT('auditTrail.thisWeek', 'Këtë javë')}</p>
                </div>
                <div className="p-3 bg-[#2a6b66]/20 rounded-full">
                  <XCircle className="w-6 h-6 text-[#2a6b66]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1c514f]/10 to-[#1c514f]/20 border-[#1c514f]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1c514f] mb-1">{safeT('auditTrail.activeUsers', 'Përdorues Aktivë')}</p>
                  <p className="text-3xl font-bold text-[#1c514f]">{stats.activeUsers || 0}</p>
                  <p className="text-xs text-[#1c514f] mt-1">{safeT('auditTrail.thisWeek', 'Këtë javë')}</p>
                </div>
                <div className="p-3 bg-[#1c514f]/20 rounded-full">
                  <Users className="w-6 h-6 text-[#1c514f]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Activity Distribution Chart */}
          <Card className="border-2 border-[#32938b]/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10">
              <CardTitle className="flex items-center gap-2 text-[#32938b]">
                <PieChart className="w-5 h-5" />
                {safeT('auditTrail.activityDistribution', 'Shpërndarja e Aktiviteteve')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={generateActivityDistributionData()}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value}`}
                  >
                    {generateActivityDistributionData().map((entry, index) => (
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

          {/* Daily Activity Chart */}
          <Card className="border-2 border-[#32938b]/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-[#32938b]/10">
              <CardTitle className="flex items-center gap-2 text-[#32938b]">
                <TrendingUp className="w-5 h-5" />
                {safeT('auditTrail.dailyActivities', 'Aktivitetet Sipas Ditëve')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generateDailyActivityData()}>
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
                  <Bar dataKey="count" fill="#32938b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filters */}
        <Card className="mb-8 border-2 border-[#32938b]/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10">
            <CardTitle className="flex items-center gap-2 text-[#32938b]">
              <Filter className="w-5 h-5" />
              {safeT('auditTrail.filterActivities', 'Filtro Aktivitetet')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {safeT('auditTrail.action', 'Veprimi')}
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({...filters, action: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-colors"
                >
                  <option value="">{safeT('auditTrail.allActions', 'Të gjitha veprimet')}</option>
                  <option value="CREATE">{safeT('auditTrail.actions.CREATE', 'Krijo')}</option>
                  <option value="UPDATE">{safeT('auditTrail.actions.UPDATE', 'Përditëso')}</option>
                  <option value="DELETE">{safeT('auditTrail.actions.DELETE', 'Fshi')}</option>
                  <option value="LOGIN">{safeT('auditTrail.actions.LOGIN', 'Kyçje')}</option>
                  <option value="LOGIN_SUCCESS">{safeT('auditTrail.actions.LOGIN_SUCCESS', 'Kyçje e Suksesshme')}</option>
                  <option value="LOGIN_FAILED">{safeT('auditTrail.actions.LOGIN_FAILED', 'Kyçje e Dështuar')}</option>
                  <option value="PAYMENT">{safeT('auditTrail.actions.PAYMENT', 'Pagesë')}</option>
                  <option value="EXPORT">{safeT('auditTrail.actions.EXPORT', 'Eksporto')}</option>
                  <option value="IMPORT">{safeT('auditTrail.actions.IMPORT', 'Importo')}</option>
                  <option value="BACKUP">{safeT('auditTrail.actions.BACKUP', 'Backup')}</option>
                  <option value="RESTORE">{safeT('auditTrail.actions.RESTORE', 'Rikthe')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {safeT('auditTrail.module', 'Moduli')}
                </label>
                <select
                  value={filters.module}
                  onChange={(e) => setFilters({...filters, module: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-colors"
                >
                  <option value="">{safeT('auditTrail.allModules', 'Të gjitha modulet')}</option>
                  <option value="CONTRACTS">{safeT('auditTrail.modules.CONTRACTS', 'Kontratat')}</option>
                  <option value="EMPLOYEES">{safeT('auditTrail.modules.EMPLOYEES', 'Punonjësit')}</option>
                  <option value="TASKS">{safeT('auditTrail.modules.TASKS', 'Detyrat')}</option>
                  <option value="AUTH">{safeT('auditTrail.modules.AUTH', 'Autentifikimi')}</option>
                  <option value="PAYMENTS">{safeT('auditTrail.modules.PAYMENTS', 'Pagesat')}</option>
                  <option value="REPORTS">{safeT('auditTrail.modules.REPORTS', 'Raportet')}</option>
                  <option value="SETTINGS">{safeT('auditTrail.modules.SETTINGS', 'Konfigurimet')}</option>
                  <option value="BACKUP">{safeT('auditTrail.modules.BACKUP', 'Backup')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {safeT('auditTrail.user', 'Përdoruesi')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.user}
                    onChange={(e) => setFilters({...filters, user: e.target.value})}
                    placeholder={safeT('auditTrail.searchUser', 'Kërko përdorues...')}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {safeT('auditTrail.dateFrom', 'Data nga')}
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {safeT('auditTrail.dateTo', 'Data deri')}
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-colors"
                />
              </div>
              <div className="flex items-end space-x-2">
                <Button
                  onClick={applyFilters}
                  className="bg-[#32938b] hover:bg-[#2a6b66] px-6 py-2"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {safeT('auditTrail.apply', 'Apliko')}
                </Button>
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="px-6 py-2"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {safeT('auditTrail.reset', 'Reset')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Audit Logs List */}
        <Card className="border-2 border-[#32938b]/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#2a6b66]/10 to-[#1c514f]/10">
            <CardTitle className="flex items-center gap-2 text-[#32938b]">
              <Eye className="w-5 h-5" />
              {safeT('auditTrail.activities', 'Aktivitetet')} ({filteredLogs.length} {safeT('auditTrail.results', 'rezultate')})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">{safeT('auditTrail.noActivitiesFound', 'Nuk u gjetën aktivitete')}</h3>
                <p className="text-gray-500">{safeT('auditTrail.tryChangingFilters', 'Provoni të ndryshoni filtrat për të parë më shumë rezultate')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-all duration-200 hover:shadow-md cursor-pointer group"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowDetails(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl">{getModuleIcon(log.module)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                            <span className={`text-sm font-medium ${getModuleColor(log.module)}`}>
                              {getModuleIcon(log.module)} {log.module}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm')}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-gray-800 font-medium">
                              {log.user_name || log.user_email || safeT('auditTrail.unknownUser', 'Përdorues i panjohur')}
                            </p>
                            
                            {log.description && (
                              <p className="text-gray-600 text-sm">{log.description}</p>
                            )}
                            
                            {/* Show failed login reasons */}
                            {log.action === 'LOGIN_FAILED' && log.details && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-red-700 mb-2">
                                  <XCircle className="w-4 h-4" />
                                  <span className="font-medium">{safeT('auditTrail.failedLoginReason', 'Arsyeja e dështimit:')}</span>
                                </div>
                                <p className="text-red-600 text-sm">
                                                                      {log.details.reason || log.details.error || safeT('auditTrail.wrongCredentials', 'Fjalëkalim ose email i gabuar')}
                                </p>
                                {log.details.attemptedEmail && (
                                  <p className="text-red-500 text-xs mt-1">
                                    {safeT('auditTrail.attemptedEmail', 'Email i provuar:')} {log.details.attemptedEmail}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Show successful login info */}
                            {log.action === 'LOGIN_SUCCESS' && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="font-medium">{safeT('auditTrail.successfulLogin', 'Kyçje e suksesshme')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {getSeverityIcon(log.severity)}
                        <Eye className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    
                    {/* Additional metadata */}
                    {log.ip_address && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            🌐 {safeT('auditTrail.ipAddress', 'IP:')} <span className="font-medium">{log.ip_address}</span>
                            {log.details?.ipInfo && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.details.ipInfo.isLocal 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : log.details.ipInfo.isProxy 
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-green-100 text-green-700'
                              }`}>
                                {log.details.ipInfo.type}
                              </span>
                            )}
                          </span>
                          {log.entity_id && (
                            <span className="flex items-center gap-1">
                              🆔 {safeT('auditTrail.entityId', 'ID:')} <span className="font-medium">{log.entity_id}</span>
                            </span>
                          )}
                          {log.details?.ipInfo?.location && (
                            <span className="flex items-center gap-1">
                              📍 <span className="font-medium">{safeT('auditTrail.location', 'Lokacioni:')} {log.details.ipInfo.location}</span>
                            </span>
                          )}
                        </div>
                        {/* Enhanced IP information */}
                        {log.details?.ipInfo && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">{safeT('auditTrail.type', 'Tipi:')}</span>
                                <span className="ml-1 font-medium">{log.details.ipInfo.type}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">{safeT('auditTrail.location', 'Lokacioni:')}</span>
                                <span className="ml-1 font-medium">{log.details.ipInfo.location}</span>
                              </div>
                              {log.details.ipInfo.isLocal && (
                                <div className="col-span-2">
                                  <span className="text-blue-600 text-xs">🔒 {safeT('auditTrail.localConnection', 'Lidhje lokale/private')}</span>
                                </div>
                              )}
                              {log.details.ipInfo.isProxy && (
                                <div className="col-span-2">
                                  <span className="text-purple-600 text-xs">☁️ {safeT('auditTrail.cloudProxyConnection', 'Lidhje përmes cloud/proxy')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Details Modal */}
        {showDetails && selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{safeT('auditTrail.activityDetails', 'Detajet e Aktivitetit')}</h3>
                  <Button
                    onClick={() => setShowDetails(false)}
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{safeT('auditTrail.action', 'Veprimi')}</label>
                      <p className="text-gray-900 font-medium">{selectedLog.action}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{safeT('auditTrail.module', 'Moduli')}</label>
                      <p className="text-gray-900">{selectedLog.module}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{safeT('auditTrail.user', 'Përdoruesi')}</label>
                      <p className="text-gray-900">{selectedLog.user_name || selectedLog.user_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data</label>
                      <p className="text-gray-900">{format(new Date(selectedLog.timestamp), 'dd MMM yyyy, HH:mm:ss')}</p>
                    </div>
                  </div>
                  
                  {selectedLog.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{safeT('auditTrail.description', 'Përshkrimi')}</label>
                      <p className="text-gray-900">{selectedLog.description}</p>
                    </div>
                  )}
                  
                  {selectedLog.details && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{safeT('auditTrail.details', 'Detajet')}</label>
                      <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedLog.ip_address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{safeT('auditTrail.ipAddress', 'IP Address')}</label>
                      <p className="text-gray-900">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

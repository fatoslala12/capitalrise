import { useState, useEffect, useCallback } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { sq } from "date-fns/locale";
import api from "../api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Container, Grid } from "../components/ui/Layout";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  AreaChart, Area
} from "recharts";
import { 
  Search, Filter, Download, RefreshCw, Eye, 
  AlertTriangle, TrendingUp, Users, Activity,
  Calendar, Clock, User, Shield, Database
} from "lucide-react";

export default function AuditTrail() {
  const { user } = useAuth();
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
    console.log('🔍 AuditTrail component loading, API baseURL:', api.defaults.baseURL);
    fetchData();
    
    // Set up real-time updates if enabled
    if (realTimeMode) {
      const interval = setInterval(fetchData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [realTimeMode]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching audit data from:', api.defaults.baseURL);
      console.log('🔍 Filters:', filters);
      
      const [logsRes, statsRes, suspiciousRes, entitiesRes] = await Promise.all([
        api.get('/api/audit/test-logs', { params: { ...filters, ...advancedFilters } }),
        api.get('/api/audit/test-stats'),
        api.get('/api/audit/suspicious-activity'),
        api.get('/api/audit/most-active-entities')
      ]);

      console.log('🔍 Audit logs response:', logsRes.data);
      setAuditLogs(logsRes.data.data || []);
      setStats(statsRes.data.data);
      setSuspiciousActivities(suspiciousRes.data.data || []);
      setMostActiveEntities(entitiesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Gabim gjatë ngarkimit të të dhënave');
    } finally {
      setLoading(false);
    }
  }, [filters, advancedFilters]);

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
      ipAddress: "",
      entityType: "",
      entityId: "",
      hasChanges: false,
      timeRange: "7d"
    });
  };

  // Eksporto në Excel
  const exportToExcel = async () => {
    try {
      const response = await api.get('/api/audit/export-excel', {
        params: { ...filters, ...advancedFilters },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs u eksportuan në Excel me sukses!');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error('Gabim gjatë eksportimit');
    }
  };

  // Eksporto në PDF
  const exportToPDF = async () => {
    try {
      const response = await api.get('/api/audit/export-pdf', {
        params: { ...filters, ...advancedFilters },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-report-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Raporti u eksportua në PDF me sukses!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Gabim gjatë eksportimit të PDF');
    }
  };

  // Pastro audit logs të vjetër
  const cleanupOldLogs = async () => {
    if (!window.confirm('A jeni i sigurt që doni të pastroni audit logs të vjetër (më të vjetër se 1 vit)?')) {
      return;
    }

    try {
      const response = await api.post('/api/audit/cleanup', { daysToKeep: 365 });
      
      if (response.data.success) {
        toast.success(`U fshinë ${response.data.data.deletedCount} audit logs të vjetër`);
        fetchData(); // Rifresko të dhënat
      }
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      toast.error('Gabim gjatë pastrimit të audit logs');
    }
  };

  // Formato datën
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown';
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: sq });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Merr ngjyrën e severity
  const getSeverityColor = (severity) => {
    if (!severity) return 'blue';
    switch (severity) {
      case 'high': return 'red';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      default: return 'blue';
    }
  };

  // Merr ikonën e action
  const getActionIcon = (action) => {
    if (!action) return '📝';
    switch (action) {
      case 'CREATE': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      case 'LOGIN': return '🔐';
      case 'PAYMENT': return '💰';
      case 'EXPORT': return '📤';
      case 'IMPORT': return '📥';
      case 'BACKUP': return '💾';
      case 'RESTORE': return '🔄';
      default: return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      case 'LOGIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PAYMENT': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'EXPORT': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'IMPORT': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'BACKUP': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'RESTORE': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getModuleIcon = (module) => {
    switch (module) {
      case 'CONTRACTS': return '📄';
      case 'EMPLOYEES': return '👥';
      case 'TASKS': return '✅';
      case 'AUTH': return '🔐';
      case 'PAYMENTS': return '💰';
      case 'REPORTS': return '📊';
      case 'SETTINGS': return '⚙️';
      case 'BACKUP': return '💾';
      default: return '📋';
    }
  };

  const getModuleColor = (module) => {
    switch (module) {
      case 'CONTRACTS': return 'text-blue-600';
      case 'EMPLOYEES': return 'text-green-600';
      case 'TASKS': return 'text-purple-600';
      case 'AUTH': return 'text-red-600';
      case 'PAYMENTS': return 'text-yellow-600';
      case 'REPORTS': return 'text-indigo-600';
      case 'SETTINGS': return 'text-gray-600';
      case 'BACKUP': return 'text-cyan-600';
      default: return 'text-gray-600';
    }
  };

  // The filtering is now handled by the API, so we just use the auditLogs directly
  const filteredLogs = auditLogs;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-red-600 text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Gabim gjatë ngarkimit</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Provoni përsëri
            </button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Header with enhanced design */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              🔍 Audit Trail
            </h1>
            <p className="text-gray-600 text-lg">
              Monitoroni të gjitha aktivitetet dhe ndryshimet në sistem në kohë reale
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setRealTimeMode(!realTimeMode)}
              variant={realTimeMode ? "primary" : "outline"}
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              {realTimeMode ? 'Real-time ON' : 'Real-time OFF'}
            </Button>
            <Button 
              onClick={fetchData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Rifresko
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total Aktivitetet</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalLogs || 0}</p>
                <p className="text-xs text-blue-600 mt-1">+12% nga muaji i kaluar</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Database className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Sot</p>
                <p className="text-3xl font-bold text-green-900">{stats.todayLogs || 0}</p>
                <p className="text-xs text-green-600 mt-1">+5% nga dje</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">Aktivitete të Dyshimta</p>
                <p className="text-3xl font-bold text-yellow-900">{suspiciousActivities.length || 0}</p>
                <p className="text-xs text-yellow-600 mt-1">Kërkojnë vëmendje</p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Përdorues Aktivë</p>
                <p className="text-3xl font-bold text-purple-900">{stats.activeUsers || 0}</p>
                <p className="text-xs text-purple-600 mt-1">Këtë javë</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Users className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card className="mb-6 border-2 border-gray-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Filter className="w-5 h-5" />
            Filtro Aktivitetet
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Grid cols={3} gap={4} className="mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Veprimi
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({...filters, action: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Të gjitha veprimet</option>
                <option value="CREATE">Krijo</option>
                <option value="UPDATE">Përditëso</option>
                <option value="DELETE">Fshi</option>
                <option value="LOGIN">Kyçje</option>
                <option value="PAYMENT">Pagesë</option>
                <option value="EXPORT">Eksporto</option>
                <option value="IMPORT">Importo</option>
                <option value="BACKUP">Backup</option>
                <option value="RESTORE">Rikthe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moduli
              </label>
              <select
                value={filters.module}
                onChange={(e) => setFilters({...filters, module: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Të gjitha modulet</option>
                <option value="CONTRACTS">Kontratat</option>
                <option value="EMPLOYEES">Punonjësit</option>
                <option value="TASKS">Detyrat</option>
                <option value="AUTH">Autentifikimi</option>
                <option value="PAYMENTS">Pagesat</option>
                <option value="REPORTS">Raportet</option>
                <option value="SETTINGS">Konfigurimet</option>
                <option value="BACKUP">Backup</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Përdoruesi
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.user}
                  onChange={(e) => setFilters({...filters, user: e.target.value})}
                  placeholder="Kërko përdorues..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </Grid>

          <Grid cols={3} gap={4} className="mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data nga
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data deri
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limit rezultateve
              </label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({...filters, limit: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value={50}>50 rezultate</option>
                <option value={100}>100 rezultate</option>
                <option value={200}>200 rezultate</option>
                <option value={500}>500 rezultate</option>
              </select>
            </div>
          </Grid>

          <div className="flex flex-wrap gap-3">
            <Button onClick={applyFilters} variant="primary" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Apliko Filtra
            </Button>
            <Button onClick={resetFilters} variant="secondary" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reset
            </Button>
            <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Eksporto Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Eksporto PDF
            </Button>
            <Button onClick={cleanupOldLogs} variant="outline" className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
              <AlertTriangle className="w-4 h-4" />
              Pastro Logs të Vjetër
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity Distribution Chart */}
        <Card className="border-2 border-gray-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <TrendingUp className="w-5 h-5" />
              Shpërndarja e Aktiviteteve
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                {(() => {
                  const pieData = [
                    { name: 'Krijo', value: stats.createCount || 0, color: '#10b981' },
                    { name: 'Përditëso', value: stats.updateCount || 0, color: '#3b82f6' },
                    { name: 'Fshi', value: stats.deleteCount || 0, color: '#ef4444' },
                    { name: 'Kyçje', value: stats.loginCount || 0, color: '#8b5cf6' },
                    { name: 'Pagesë', value: stats.paymentCount || 0, color: '#f59e0b' }
                  ].filter(item => item.value > 0);

                  return pieData.length > 0 ? (
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  ) : (
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#6b7280">
                      Nuk ka të dhëna
                    </text>
                  );
                })()}
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Timeline Chart */}
        <Card className="border-2 border-gray-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Activity className="w-5 h-5" />
              Aktivitetet Sipas Ditëve
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(() => {
                if (!auditLogs || auditLogs.length === 0) return [];
                const dailyData = auditLogs.reduce((acc, log) => {
                  const date = format(new Date(log.timestamp), 'dd MMM');
                  acc[date] = (acc[date] || 0) + 1;
                  return acc;
                }, {});
                return Object.entries(dailyData).map(([date, count]) => ({ date, count }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Audit Logs List */}
      <Card className="border-2 border-gray-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Eye className="w-5 h-5" />
            Aktivitetet ({filteredLogs.length} rezultate)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Nuk u gjetën aktivitete</h3>
              <p className="text-gray-500">Provoni të ndryshoni filtrat për të parë më shumë rezultate</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-all duration-200 hover:shadow-md cursor-pointer"
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
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                          {log.description}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {log.user_name || log.user_email || 'Sistemi'}
                          </span>
                          {log.ip_address && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-4 h-4" />
                              {log.ip_address}
                            </span>
                          )}
                          {log.entity_id && (
                            <span className="flex items-center gap-1">
                              <Database className="w-4 h-4" />
                              ID: {log.entity_id}
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm font-medium text-blue-800 mb-1">Detaje të ndryshimeve:</p>
                            <pre className="text-xs text-blue-600 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                          setShowDetails(true);
                        }}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Detaje
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detaje të Aktivitetit</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDetails(false)}
              >
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Veprimi</label>
                  <p className="text-lg font-semibold">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Moduli</label>
                  <p className="text-lg font-semibold">{selectedLog.module}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Përdoruesi</label>
                  <p className="text-lg font-semibold">{selectedLog.user_name || selectedLog.user_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data</label>
                  <p className="text-lg font-semibold">{formatDate(selectedLog.timestamp)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Përshkrimi</label>
                <p className="text-lg">{selectedLog.description}</p>
              </div>
              {selectedLog.details && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Detaje të Plota</label>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

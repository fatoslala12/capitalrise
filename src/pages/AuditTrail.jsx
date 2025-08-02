import { useState, useEffect } from "react";
import { format } from "date-fns";
import api from "../api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Container, Grid } from "../components/ui/Layout";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function AuditTrail() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [mostActiveEntities, setMostActiveEntities] = useState([]);
  const [filters, setFilters] = useState({
    action: "",
    user: "",
    dateFrom: "",
    dateTo: "",
    module: ""
  });

  useEffect(() => {
    console.log('🔍 AuditTrail component loading, API baseURL:', api.defaults.baseURL);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching audit data from:', api.defaults.baseURL);
      console.log('🔍 Filters:', filters);
      
      const [logsRes, statsRes, suspiciousRes, entitiesRes] = await Promise.all([
        api.get('/api/audit/logs', { params: filters }),
        api.get('/api/audit/stats'),
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
  };

  // Apliko filtra
  const applyFilters = () => {
    fetchData();
  };

  // Reset filtra
  const resetFilters = () => {
    setFilters({
      action: '',
      user: '',
      dateFrom: '',
      dateTo: '',
      module: ''
    });
  };

  // Eksporto në CSV
  const exportToCSV = async () => {
    try {
      const response = await api.get('/api/audit/export-csv', {
        params: filters,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs u eksportuan me sukses!');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error('Gabim gjatë eksportimit');
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
      return new Date(dateString).toLocaleString('sq-AL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
      default: return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN': return 'bg-purple-100 text-purple-800';
      case 'PAYMENT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModuleIcon = (module) => {
    switch (module) {
      case 'CONTRACTS': return '📄';
      case 'EMPLOYEES': return '👥';
      case 'TASKS': return '✅';
      case 'AUTH': return '🔐';
      case 'PAYMENTS': return '💰';
      default: return '📋';
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🔍 Audit Trail
        </h1>
        <p className="text-gray-600">
          Shikoni të gjitha aktivitetet dhe ndryshimet në sistem
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtro aktivitetet</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid cols={5} gap={4}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Veprimi
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({...filters, action: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Të gjitha</option>
                <option value="CREATE">Krijo</option>
                <option value="UPDATE">Përditëso</option>
                <option value="DELETE">Fshi</option>
                <option value="LOGIN">Kyçje</option>
                <option value="PAYMENT">Pagesë</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moduli
              </label>
              <select
                value={filters.module}
                onChange={(e) => setFilters({...filters, module: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Të gjitha</option>
                <option value="CONTRACTS">Kontratat</option>
                <option value="EMPLOYEES">Punonjësit</option>
                <option value="TASKS">Detyrat</option>
                <option value="AUTH">Autentifikimi</option>
                <option value="PAYMENTS">Pagesat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Përdoruesi
              </label>
              <input
                type="text"
                value={filters.user}
                onChange={(e) => setFilters({...filters, user: e.target.value})}
                placeholder="Emri i përdoruesit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data nga
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data deri
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </Grid>
          <div className="flex gap-2 mt-4">
            <Button onClick={applyFilters} variant="primary">
              Apliko filtra
            </Button>
            <Button onClick={resetFilters} variant="secondary">
              Reset
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              Eksporto CSV
            </Button>
            <Button onClick={cleanupOldLogs} variant="outline" className="text-red-600 hover:text-red-700">
              Pastro logs të vjetër
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total aktivitete</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLogs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sot</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayLogs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktivitete të dyshimta</p>
                <p className="text-2xl font-bold text-gray-900">{suspiciousActivities.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Përdorues aktivë</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Shpërndarja e aktiviteteve</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                {(() => {
                  const pieData = [
                    { name: 'Krijo', value: stats.createCount || 0 },
                    { name: 'Përditëso', value: stats.updateCount || 0 },
                    { name: 'Fshi', value: stats.deleteCount || 0 },
                    { name: 'Kyçje', value: stats.loginCount || 0 },
                    { name: 'Pagesë', value: stats.paymentCount || 0 }
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
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
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
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Aktivitetet ({filteredLogs.length} rezultate)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <p className="text-gray-500">Nuk u gjetën aktivitete për filtrat e zgjedhur</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{getModuleIcon(log.module)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-sm text-gray-500">
                            {getModuleIcon(log.module)} {log.module}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">
                          {log.description}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Përdorues: <span className="font-medium">{log.user_name || log.user_email}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                        </p>
                        {log.details && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            <strong>Detaje:</strong> {JSON.stringify(log.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

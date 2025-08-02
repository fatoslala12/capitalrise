import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Container, Grid } from "../components/ui/Layout";
import Button from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { toast } from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell
} from "recharts";

export default function AuditTrail() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    severity: '',
    startDate: '',
    endDate: '',
    limit: 100
  });
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [mostActiveEntities, setMostActiveEntities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Merr të dhënat në fillim
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
      entityType: '',
      action: '',
      severity: '',
      startDate: '',
      endDate: '',
      limit: 100
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
      case 'READ': return '👁️';
      case 'LOGIN_SUCCESS': return '🔓';
      case 'LOGIN_FAILED': return '🔒';
      case 'LOGOUT': return '🚪';
      default: return '📝';
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen={true} size="xl" text="Duke ngarkuar audit trail..." />;
  }

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Akses i Kufizuar</h1>
          <p className="text-red-600">Vetëm adminët dhe menaxherët mund të aksesojnë këtë faqe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 border border-purple-200">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 rounded-xl p-3 shadow-sm">
            <span className="text-3xl">🔍</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700">
              Audit Trail
            </h1>
            <p className="text-lg text-purple-700 mt-1">
              Gjurmoni të gjitha veprimet dhe ndryshimet në sistem
            </p>
          </div>
        </div>
      </div>

      {/* Statistika */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Statistika të Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{stats.total_events || 0}</div>
                <div className="text-sm text-blue-600">Total Veprime</div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <div className="text-2xl font-bold text-green-700">{stats.unique_users || 0}</div>
                <div className="text-sm text-green-600">Përdorues Unikë</div>
              </div>
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{stats.high_severity_events || 0}</div>
                <div className="text-sm text-yellow-600">Veprime Kritike</div>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                <div className="text-2xl font-bold text-red-700">{suspiciousActivities.length}</div>
                <div className="text-sm text-red-600">Aktivitet të Verdësishëm</div>
              </div>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filtra */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">🔍 Filtra</span>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                {showFilters ? 'Fsheh Filtra' : 'Shfaq Filtra'}
              </Button>
              <Button
                onClick={exportToCSV}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                📊 Eksporto CSV
              </Button>
              {user?.role === 'admin' && (
                <Button
                  onClick={cleanupOldLogs}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  🧹 Pastro të Vjetër
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipi i Entitetit</label>
                <select
                  value={filters.entityType}
                  onChange={(e) => setFilters({...filters, entityType: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Të gjitha</option>
                  <option value="users">Përdoruesit</option>
                  <option value="employees">Punonjësit</option>
                  <option value="contracts">Kontratat</option>
                  <option value="payments">Pagesat</option>
                  <option value="tasks">Detyrat</option>
                  <option value="auth">Autentikimi</option>
                  <option value="system">Sistemi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Veprimi</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({...filters, action: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Të gjitha</option>
                  <option value="CREATE">Krijim</option>
                  <option value="UPDATE">Përditësim</option>
                  <option value="DELETE">Fshirje</option>
                  <option value="READ">Lexim</option>
                  <option value="LOGIN_SUCCESS">Login i Suksesshëm</option>
                  <option value="LOGIN_FAILED">Login i Dështuar</option>
                  <option value="LOGOUT">Logout</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rëndësia</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({...filters, severity: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Të gjitha</option>
                  <option value="info">Info</option>
                  <option value="warning">Paralajmërim</option>
                  <option value="high">E Lartë</option>
                  <option value="error">Gabim</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fillestare</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Përfundimtare</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Limit</label>
                <input
                  type="number"
                  value={filters.limit}
                  onChange={(e) => setFilters({...filters, limit: parseInt(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="1000"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={applyFilters}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                🔍 Apliko Filtra
              </Button>
              <Button
                onClick={resetFilters}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                🔄 Reset
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Aktivitet të Verdësishëm */}
      {suspiciousActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              ⚠️ Aktivitet të Verdësishëm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suspiciousActivities.map((activity, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-red-800">{activity.type}</h4>
                      <p className="text-red-600">{activity.description}</p>
                      <p className="text-sm text-red-500">Përdorues: {activity.user}</p>
                    </div>
                    <StatusBadge status={activity.severity} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grafikë */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Veprimet sipas ditëve */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📈 Veprimet Sipas Ditëve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(() => {
                if (!auditLogs || auditLogs.length === 0) return [];
                return auditLogs.slice(0, 10).map(log => ({
                  date: new Date(log.timestamp).toLocaleDateString(),
                  count: 1
                })).reduce((acc, curr) => {
                  const existing = acc.find(item => item.date === curr.date);
                  if (existing) {
                    existing.count++;
                  } else {
                    acc.push(curr);
                  }
                  return acc;
                }, []);
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Veprimet sipas tipit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🥧 Veprimet Sipas Tipit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                {(() => {
                  if (!auditLogs || auditLogs.length === 0) {
                    return (
                      <Pie
                        data={[{ name: 'No Data', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name }) => name}
                      >
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    );
                  }
                  
                  const actionCounts = auditLogs.reduce((acc, log) => {
                    acc[log.action] = (acc[log.action] || 0) + 1;
                    return acc;
                  }, {});
                  const pieData = Object.entries(actionCounts).map(([action, count]) => ({ name: action, value: count }));
                  
                  return (
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
                  );
                })()}
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista e Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Audit Logs ({auditLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nuk ka audit logs</h3>
              <p className="text-gray-500">Nuk u gjetën audit logs me filtrat e aplikuar</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {auditLogs.map((log, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getActionIcon(log.action || 'UNKNOWN')}</span>
                        <span className="font-bold text-lg">{log.action || 'UNKNOWN'}</span>
                        <StatusBadge status={getSeverityColor(log.severity || 'info')} />
                      </div>
                      <p className="text-gray-700 mb-2">{log.description || 'No description available'}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>👤 {log.user_email || 'Sistemi'}</span>
                        <span>🏷️ {log.entity_type || 'Unknown'}</span>
                        {log.entity_id && <span>🆔 {log.entity_id}</span>}
                        <span>📅 {log.timestamp ? formatDate(log.timestamp) : 'Unknown'}</span>
                        {log.ip_address && <span>🌐 {log.ip_address}</span>}
                      </div>
                      {log.changes && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm font-medium text-blue-800 mb-1">Ndryshimet:</p>
                          <pre className="text-xs text-blue-600 overflow-x-auto">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
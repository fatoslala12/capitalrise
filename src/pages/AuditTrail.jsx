import { useState, useEffect } from "react";
import { format } from "date-fns";
import api from "../api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Container, Grid } from "../components/ui/Layout";
import { useAuth } from "../context/AuthContext";

export default function AuditTrail() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
=======
    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (filters.action) params.append('action', filters.action);
        if (filters.module) params.append('module', filters.module);
        if (filters.user) params.append('user', filters.user);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        
        const response = await api.get(`/api/audit-trail?${params.toString()}`);
        if (response.data && response.data.logs) {
          setAuditLogs(response.data.logs);
        } else {
          // Fallback to mock data if API is not available
          const mockAuditLogs = [
            {
              id: 1,
              action: "CREATE",
              module: "CONTRACTS",
              description: "Kontratë e re u krijua",
              user_id: 1,
              user_name: "Admin User",
              timestamp: new Date().toISOString(),
              details: { contractNumber: "CTR-2024-001" }
            },
            {
              id: 2,
              action: "UPDATE",
              module: "EMPLOYEES",
              description: "Punonjës u përditësua",
              user_id: 2,
              user_name: "Manager User",
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              details: { employeeId: 5, changes: ["hourlyRate", "workplace"] }
            },
            {
              id: 3,
              action: "DELETE",
              module: "TASKS",
              description: "Detyrë u fshi",
              user_id: 1,
              user_name: "Admin User",
              timestamp: new Date(Date.now() - 172800000).toISOString(),
              details: { taskId: 12 }
            },
            {
              id: 4,
              action: "LOGIN",
              module: "AUTH",
              description: "Përdorues u kyç në sistem",
              user_id: 3,
              user_name: "User Test",
              timestamp: new Date(Date.now() - 259200000).toISOString(),
              details: { ipAddress: "192.168.1.100" }
            },
            {
              id: 5,
              action: "PAYMENT",
              module: "PAYMENTS",
              description: "Pagesë u procesua",
              user_id: 1,
              user_name: "Admin User",
              timestamp: new Date(Date.now() - 345600000).toISOString(),
              details: { paymentId: 8, amount: 1500 }
            }
          ];
          setAuditLogs(mockAuditLogs);
        }
        
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        setError('Gabim gjatë ngarkimit të audit trail. Ju lutem provoni përsëri.');
      } finally {
        setLoading(false);
>>>>>>> a11a6bc0bba4b0742495e2269514e012a03132b9
      }
    };

<<<<<<< HEAD
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
=======
    fetchAuditLogs();
  }, [filters]);

  const getActionColor = (action) => {
>>>>>>> a11a6bc0bba4b0742495e2269514e012a03132b9
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
                <option value="CREATE">Krijim</option>
                <option value="UPDATE">Përditësim</option>
                <option value="DELETE">Fshirje</option>
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
                placeholder="Kërko përdorues..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nga data
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
                Deri data
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </Grid>

          <div className="mt-4">
            <Button
              onClick={() => setFilters({
                action: "",
                user: "",
                dateFrom: "",
                dateTo: "",
                module: ""
              })}
              variant="outline"
              size="sm"
            >
              Pastro filtrat
            </Button>
          </div>
        </CardContent>
      </Card>

<<<<<<< HEAD
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
=======
      {/* Audit Logs */}
>>>>>>> a11a6bc0bba4b0742495e2269514e012a03132b9
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
<<<<<<< HEAD
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
=======
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
>>>>>>> a11a6bc0bba4b0742495e2269514e012a03132b9
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

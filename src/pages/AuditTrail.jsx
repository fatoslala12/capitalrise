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
        setAuditLogs(response.data.logs || []);
        
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        setError('Gabim gjatë ngarkimit të audit trail. Ju lutem provoni përsëri.');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [filters]);

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
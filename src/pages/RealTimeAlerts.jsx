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
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
  AlertTriangle, Shield, Activity, Eye, Clock, Users, TrendingUp, AlertCircle, CheckCircle, XCircle, Zap, RefreshCw, Play, Square, Settings
} from "lucide-react";

export default function RealTimeAlerts() {
  const { user } = useAuth();
  const [monitoringStatus, setMonitoringStatus] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [alertRules, setAlertRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [showRulesConfig, setShowRulesConfig] = useState(false);
  const [showIPConfig, setShowIPConfig] = useState(false);
  const [newIP, setNewIP] = useState({ ipAddress: '', reason: '' });
  const [liveMode, setLiveMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Merr të dhënat në fillim
  useEffect(() => {
    fetchData();
  }, []);

  // Live updates
  useEffect(() => {
    let interval;
    if (liveMode) {
      interval = setInterval(() => {
        fetchData();
        setLastUpdate(new Date());
      }, 10000); // Update every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, alertsRes, statsRes, rulesRes] = await Promise.all([
        api.get('/api/real-time-alerts/test-status'),
        api.get('/api/real-time-alerts/test-recent'),
        api.get('/api/real-time-alerts/test-stats'),
        api.get('/api/real-time-alerts/test-rules')
      ]);

      setMonitoringStatus(statusRes.data.data);
      setRecentAlerts(alertsRes.data.data || []);
      setAlertStats(statsRes.data.data);
      setAlertRules(rulesRes.data.data.rules || {});
    } catch (error) {
      console.error('Error fetching real-time alert data:', error);
      toast.error('Gabim gjatë ngarkimit të të dhënave');
    } finally {
      setLoading(false);
    }
  };

  // Fillo monitoring
  const startMonitoring = async () => {
    try {
      const response = await api.post('/api/real-time-alerts/start');
      if (response.data.success) {
        toast.success('Real-time monitoring u aktivizua!');
        fetchData();
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      toast.error('Gabim gjatë aktivizimit të monitoring');
    }
  };

  // Ndalo monitoring
  const stopMonitoring = async () => {
    try {
      const response = await api.post('/api/real-time-alerts/stop');
      if (response.data.success) {
        toast.success('Real-time monitoring u ndal!');
        fetchData();
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      toast.error('Gabim gjatë ndalimit të monitoring');
    }
  };

  // Test alert
  const testAlert = async () => {
    try {
      const response = await api.post('/api/real-time-alerts/test', {
        alertType: 'TEST_ALERT'
      });
      if (response.data.success) {
        toast.success('Test alert u dërgua! Kontrollo njoftimet.');
      }
    } catch (error) {
      console.error('Error sending test alert:', error);
      toast.error('Gabim gjatë dërgimit të test alert');
    }
  };

  // Pastro alerts të vjetër
  const cleanupOldAlerts = async () => {
    if (!window.confirm('A jeni i sigurt që doni të pastroni alerts të vjetër?')) {
      return;
    }

    try {
      const response = await api.post('/api/real-time-alerts/cleanup', {
        days: 30
      });
      if (response.data.success) {
        toast.success(`U fshinë ${response.data.data.deletedCount} alerts të vjetër`);
        fetchData();
      }
    } catch (error) {
      console.error('Error cleaning up alerts:', error);
      toast.error('Gabim gjatë pastrimit të alerts');
    }
  };

  // Përditëso alert rules
  const updateAlertRules = async (rules) => {
    try {
      const response = await api.post('/api/real-time-alerts/rules', { rules });
      if (response.data.success) {
        toast.success('Alert rules u përditësuan!');
        setAlertRules(response.data.data.configuredRules);
        setShowRulesConfig(false);
      }
    } catch (error) {
      console.error('Error updating alert rules:', error);
      toast.error('Gabim gjatë përditësimit të rules');
    }
  };

  // Shto IP të verdhësishëm
  const addSuspiciousIP = async () => {
    if (!newIP.ipAddress || !newIP.reason) {
      toast.error('Ju lutem plotësoni të gjitha fushat');
      return;
    }

    try {
      const response = await api.post('/api/real-time-alerts/suspicious-ip', newIP);
      if (response.data.success) {
        toast.success('IP i verdhësishëm u shtua!');
        setNewIP({ ipAddress: '', reason: '' });
        setShowIPConfig(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error adding suspicious IP:', error);
      toast.error('Gabim gjatë shtimit të IP');
    }
  };

  // Hiq IP të verdhësishëm
  const removeSuspiciousIP = async (ipAddress) => {
    try {
      const response = await api.delete(`/api/real-time-alerts/suspicious-ip/${ipAddress}`);
      if (response.data.success) {
        toast.success('IP i verdhësishëm u hoq!');
        fetchData();
      }
    } catch (error) {
      console.error('Error removing suspicious IP:', error);
      toast.error('Gabim gjatë heqjes së IP');
    }
  };

  // Formato datën
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('sq-AL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Merr ngjyrën e severity
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'red';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      default: return 'blue';
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen={true} size="xl" text="Duke ngarkuar real-time alerts..." />;
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
      <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-2xl shadow-lg p-8 border border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 rounded-xl p-3 shadow-sm">
              <span className="text-3xl">🚨</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-700 to-orange-700">
                Real-Time Alerts
              </h1>
              <p className="text-lg text-red-700 mt-1">
                Monitorimi dhe menaxhimi i alerts në kohë reale
              </p>
              {lastUpdate && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Përditësuar: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setLiveMode(!liveMode)}
              variant={liveMode ? "primary" : "outline"}
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              {liveMode ? 'Live ON' : 'Live OFF'}
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

      {/* Statusi i Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">📊 Statusi i Monitoring</span>
            <div className="flex gap-2">
              {monitoringStatus?.isActive ? (
                <Button
                  onClick={stopMonitoring}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  ⏹️ Ndalo Monitoring
                </Button>
              ) : (
                <Button
                  onClick={startMonitoring}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  ▶️ Fillo Monitoring
                </Button>
              )}
              {user?.role === 'admin' && (
                <Button
                  onClick={testAlert}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  🧪 Test Alert
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md">
            <div className={`p-4 rounded-xl border ${monitoringStatus?.isActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`text-2xl font-bold ${monitoringStatus?.isActive ? 'text-green-700' : 'text-red-700'}`}>
                {monitoringStatus?.isActive ? '🟢 Aktiv' : '🔴 Jo Aktiv'}
              </div>
              <div className={`text-sm ${monitoringStatus?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                Real-Time Monitoring
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{monitoringStatus?.suspiciousIPs?.length || 0}</div>
              <div className="text-sm text-blue-600">IP të Verdësishëm</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{monitoringStatus?.alertHistorySize || 0}</div>
              <div className="text-sm text-yellow-600">Alerts në Historik</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">{monitoringStatus?.activeSessions || 0}</div>
              <div className="text-sm text-purple-600">Sesione Aktive</div>
            </div>
          </Grid>
        </CardContent>
      </Card>

      {/* Alert Rules Configuration */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">⚙️ Konfigurimi i Alert Rules</span>
              <Button
                onClick={() => setShowRulesConfig(!showRulesConfig)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {showRulesConfig ? 'Fsheh' : 'Konfiguro'}
              </Button>
            </CardTitle>
          </CardHeader>
          {showRulesConfig && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(alertRules).map(([ruleName, ruleConfig]) => (
                  <div key={ruleName} className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-bold text-lg mb-3 capitalize">{ruleName.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    {ruleConfig.enabled !== undefined && (
                      <div className="mb-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={ruleConfig.enabled}
                            onChange={(e) => {
                              const updatedRules = { ...alertRules };
                              updatedRules[ruleName] = { ...ruleConfig, enabled: e.target.checked };
                              updateAlertRules(updatedRules);
                            }}
                            className="mr-2"
                          />
                          Aktiv
                        </label>
                      </div>
                    )}
                    {ruleConfig.count !== undefined && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Numri i Veprimeve</label>
                        <input
                          type="number"
                          value={ruleConfig.count}
                          onChange={(e) => {
                            const updatedRules = { ...alertRules };
                            updatedRules[ruleName] = { ...ruleConfig, count: parseInt(e.target.value) };
                            updateAlertRules(updatedRules);
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          min="1"
                        />
                      </div>
                    )}
                    {ruleConfig.window !== undefined && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Periudha (orë)</label>
                        <input
                          type="number"
                          value={ruleConfig.window / (60 * 60 * 1000)}
                          onChange={(e) => {
                            const updatedRules = { ...alertRules };
                            updatedRules[ruleName] = { ...ruleConfig, window: parseInt(e.target.value) * 60 * 60 * 1000 };
                            updateAlertRules(updatedRules);
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          min="1"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* IP të Verdësishëm */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">🌐 IP të Verdësishëm</span>
              <Button
                onClick={() => setShowIPConfig(!showIPConfig)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                {showIPConfig ? 'Fsheh' : 'Shto IP'}
              </Button>
            </CardTitle>
          </CardHeader>
          {showIPConfig && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">IP Address</label>
                  <input
                    type="text"
                    value={newIP.ipAddress}
                    onChange={(e) => setNewIP({ ...newIP, ipAddress: e.target.value })}
                    placeholder="192.168.1.100"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Arsyeja</label>
                  <input
                    type="text"
                    value={newIP.reason}
                    onChange={(e) => setNewIP({ ...newIP, reason: e.target.value })}
                    placeholder="Aktivitet i verdhësishëm"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <Button
                onClick={addSuspiciousIP}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                ➕ Shto IP
              </Button>
            </CardContent>
          )}
          <CardContent>
            {monitoringStatus?.suspiciousIPs?.length > 0 ? (
              <div className="space-y-2">
                {monitoringStatus.suspiciousIPs.map((ip, index) => (
                  <div key={index} className="flex items-center justify-between bg-red-50 p-3 rounded-lg border border-red-200">
                    <span className="font-mono text-red-700">{ip}</span>
                    <Button
                      onClick={() => removeSuspiciousIP(ip)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      🗑️ Hiq
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Nuk ka IP të verdësishëm të regjistruar</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advanced Statistics Dashboard */}
      {alertStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              📊 Dashboard i Avancuar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Grid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md" className="mb-6">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-700">{alertStats?.totalAlerts || 0}</div>
                    <div className="text-sm text-red-600">Total Alerts</div>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-700">{alertStats?.todayAlerts || 0}</div>
                    <div className="text-sm text-orange-600">Alerts Sot</div>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-700">{alertStats?.criticalAlerts || 0}</div>
                    <div className="text-sm text-yellow-600">Kritike</div>
                  </div>
                  <AlertCircle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-700">{alertStats?.warningAlerts || 0}</div>
                    <div className="text-sm text-blue-600">Paralajmërime</div>
                  </div>
                  <Eye className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </Grid>

            {/* Charts */}
            {alertStats?.alertTypes && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alert Types Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Llojet e Alerts</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(alertStats.alertTypes).map(([type, count]) => ({
                      type: type.replace('_', ' '),
                      count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent Activity Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Aktiviteti i Fundit</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={[
                      { period: '1 Orë', alerts: alertStats?.recentActivity?.lastHour || 0 },
                      { period: '24 Orë', alerts: alertStats?.recentActivity?.last24Hours || 0 },
                      { period: '1 Javë', alerts: alertStats?.recentActivity?.lastWeek || 0 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="alerts" stroke="#ef4444" fill="#fef2f2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Original Chart */}
            <div className="mt-6">
              <div className="text-2xl font-bold text-blue-700 mb-4">
                Total Alerts: {alertStats.totalAlerts}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={alertStats.statsByDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts të Fundit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">📋 Alerts të Fundit ({recentAlerts.length})</span>
            {user?.role === 'admin' && (
              <Button
                onClick={cleanupOldAlerts}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                🧹 Pastro të Vjetër
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nuk ka alerts</h3>
              <p className="text-gray-500">Sistemi është i sigurt! Nuk u gjetën alerts në 24 orët e fundit</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentAlerts.map((alert, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🚨</span>
                        <span className="font-bold text-lg">{alert.action?.replace('ALERT_', '')}</span>
                        <StatusBadge status={getSeverityColor(alert.severity)} />
                      </div>
                      <p className="text-gray-700 mb-2">{alert.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>👤 {alert.user_email_display || 'Sistemi'}</span>
                        <span>📅 {formatDate(alert.timestamp)}</span>
                        {alert.ip_address && <span>🌐 {alert.ip_address}</span>}
                      </div>
                      {alert.metadata && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm font-medium text-blue-800 mb-1">Detaje:</p>
                          <pre className="text-xs text-blue-600 overflow-x-auto">
                            {JSON.stringify(alert.metadata, null, 2)}
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
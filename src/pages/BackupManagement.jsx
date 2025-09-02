import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLoader from "../components/ui/PageLoader";
import Card, { CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Container, Grid } from "../components/ui/Layout";
import Button from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { toast } from "react-hot-toast";

export default function BackupManagement() {
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
  
  const [backups, setBackups] = useState([]);
  const [databaseStatus, setDatabaseStatus] = useState(null);
  const [tableInfo, setTableInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(null);
  const [showPartialBackupModal, setShowPartialBackupModal] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);
  const [backupDescription, setBackupDescription] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [currentBackend, setCurrentBackend] = useState("");

  // Tabelat e disponueshme për backup të pjesshëm
  const [availableTables, setAvailableTables] = useState([
    { name: 'employees', label: safeT('backup.tables.employees', 'Punonjësit'), icon: '👷', count: 0 },
    { name: 'contracts', label: safeT('backup.tables.contracts', 'Kontratat'), icon: '📄', count: 0 },
    { name: 'work_hours', label: safeT('backup.tables.workHours', 'Orët e Punës'), icon: '🕒', count: 0 },
    { name: 'payments', label: safeT('backup.tables.payments', 'Pagesat'), icon: '💰', count: 0 },
    { name: 'tasks', label: safeT('backup.tables.tasks', 'Detyrat'), icon: '📋', count: 0 },
    { name: 'expenses_invoices', label: safeT('backup.tables.expenses', 'Shpenzimet'), icon: '💸', count: 0 },
    { name: 'invoices', label: safeT('backup.tables.invoices', 'Faturat'), icon: '🧾', count: 0 },
    { name: 'notifications', label: safeT('backup.tables.notifications', 'Njoftimet'), icon: '🔔', count: 0 }
  ]);

  // Merr të dhënat në fillim
  useEffect(() => {
    checkConnectionAndFetchData();
  }, []);

  // Kontrollo lidhjen dhe merr të dhënat
  const checkConnectionAndFetchData = async () => {
    try {
      setLoading(true);
      setConnectionStatus("checking");
      
      // Kontrollo statusin e lidhjes
      const healthCheck = await api.get('/api/health');
      setConnectionStatus("connected");
      setCurrentBackend(api.defaults.baseURL);
      
      // Nëse lidhja është OK, merr të dhënat
      await fetchData();
      
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus("disconnected");
      
      // Provo të lidhesh me localhost nëse production nuk funksionon
      if (api.defaults.baseURL !== "http://localhost:5000") {
        try {
          console.log('🔄 Trying localhost fallback...');
          api.defaults.baseURL = "http://localhost:5000";
          
          const localHealthCheck = await api.get('/api/health');
          setConnectionStatus("connected");
          setCurrentBackend("http://localhost:5000");
          
          // Merr të dhënat nga localhost
          await fetchData();
          
        } catch (localError) {
          console.error('Localhost also failed:', localError);
          setConnectionStatus("disconnected");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
  };

  const fetchData = async () => {
    try {
      const [backupsRes, statusRes, tableCountsRes] = await Promise.all([
        api.get('/api/backup/test-list'),
        api.get('/api/backup/test-status'),
        api.get('/api/backup/table-counts')
      ]);

      setBackups(backupsRes.data.data || []);
      setDatabaseStatus(statusRes.data.data);
      
      // Update table counts with real data
      if (tableCountsRes.data.success) {
        const updatedTables = availableTables.map(table => ({
          ...table,
          count: tableCountsRes.data.data[table.name] || 0
        }));
        setAvailableTables(updatedTables);
      }
      
      setTableInfo([]); // For now, we'll skip table info
    } catch (error) {
      console.error('Error fetching backup data:', error);
      toast.error(safeT('backup.messages.dataLoadError', 'Gabim gjatë ngarkimit të të dhënave'));
    } finally {
      setLoading(false);
    }
  };

  // Krijo backup të plotë
  const createFullBackup = async () => {
    try {
      setCreatingBackup(true);
      const response = await api.post('/api/backup/test-backup', {
        description: backupDescription || 'Backup manual i plotë'
      });

      if (response.data.success) {
        toast.success(safeT('backup.messages.fullBackupSuccess', 'Backup i plotë u krijua me sukses!'));
        setBackupDescription("");
        fetchData(); // Rifresko listën
      }
    } catch (error) {
      console.error('Error creating full backup:', error);
      toast.error(safeT('backup.messages.createBackupError', 'Gabim gjatë krijimit të backup'));
    } finally {
      setCreatingBackup(false);
    }
  };

  // Krijo backup të pjesshëm
  const createPartialBackup = async () => {
    if (selectedTables.length === 0) {
      toast.error(safeT('backup.messages.selectTablesError', 'Zgjidhni të paktën një tabelë për backup'));
      return;
    }

    try {
      setCreatingBackup(true);
      const response = await api.post('/api/backup/partial', {
        tables: selectedTables,
        description: backupDescription || `Backup për tabelat: ${selectedTables.join(', ')}`
      });

      if (response.data.success) {
        toast.success(safeT('backup.messages.partialBackupSuccess', 'Backup i pjesshëm u krijua me sukses!'));
        setSelectedTables([]);
        setBackupDescription("");
        fetchData(); // Rifresko listën
      }
    } catch (error) {
      console.error('Error creating partial backup:', error);
      toast.error(safeT('backup.messages.partialBackupError', 'Gabim gjatë krijimit të backup të pjesshëm'));
    } finally {
      setCreatingBackup(false);
    }
  };

  // Restore backup
  const restoreBackup = async (filename) => {
    if (!window.confirm(safeT('backup.messages.restoreConfirm', 'A jeni i sigurt që doni të restauroni këtë backup? Kjo do të zëvendësojë të dhënat aktuale!'))) {
      return;
    }

    try {
      setRestoringBackup(filename);
      const response = await api.post(`/api/backup/restore/${filename}`);

      if (response.data.success) {
        toast.success(safeT('backup.messages.backupRestored', 'Backup u restaurua me sukses!'));
        fetchData();
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error(safeT('backup.messages.restoreError', 'Gabim gjatë restaurimit të backup'));
    } finally {
      setRestoringBackup(null);
    }
  };

  // Fshi backup
  const deleteBackup = async (filename) => {
    if (!window.confirm(safeT('backup.messages.deleteConfirm', 'A jeni i sigurt që doni të fshini këtë backup?'))) {
      return;
    }

    try {
      const response = await api.delete(`/api/backup/${filename}`);

      if (response.data.success) {
        toast.success(safeT('backup.messages.backupDeleted', 'Backup u fshi me sukses!'));
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error(safeT('backup.messages.deleteError', 'Gabim gjatë fshirjes së backup'));
    }
  };

  // Shkarko backup
  const downloadBackup = async (filename) => {
    try {
      const response = await api.get(`/api/backup/download/${filename}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(safeT('backup.messages.backupDownloaded', 'Backup u shkarkua me sukses!'));
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error(safeT('backup.messages.downloadError', 'Gabim gjatë shkarkimit të backup'));
    }
  };

  // Pastro backup të vjetër
  const cleanupOldBackups = async () => {
    if (!window.confirm(safeT('backup.messages.cleanupConfirm', 'A jeni i sigurt që doni të pastroni backup të vjetër (më të vjetër se 30 ditë)?'))) {
      return;
    }

    try {
      const response = await api.post('/api/backup/cleanup', { retentionDays: 30 });

      if (response.data.success) {
        toast.success(safeT('backup.messages.cleanupCompleted', `Pastrimi u krye! ${response.data.data.deletedCount} backup u fshinë`));
        fetchData();
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      toast.error(safeT('backup.messages.cleanupError', 'Gabim gjatë pastrimit të backup-ve'));
    }
  };

  // Formato madhësinë e file
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Rifresko lidhjen
  const refreshConnection = () => {
    checkConnectionAndFetchData();
  };

  // Nëse nuk ka lidhje, shfaq mesazh përkatës
  if (connectionStatus === "disconnected") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-2">🔌 {safeT('backup.connectionLost', 'Lidhja me Backend u humb')}</h2>
            <p className="text-sm">
              {safeT('backup.connectionLostMessage', 'Nuk mund të lidhem me serverin e backend. Ju lutem kontrolloni:')}
            </p>
            <ul className="text-sm mt-2 text-left list-disc list-inside">
              <li>{safeT('backup.backendRunning', 'Nëse backend është duke punuar')}</li>
              <li>{safeT('backup.apiUrlCorrect', 'Nëse URL-ja e API është e saktë')}</li>
              <li>{safeT('backup.networkIssues', 'Nëse ka probleme me rrjetin')}</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={refreshConnection}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {safeT('backup.tryAgain', '🔄 Provoni përsëri')}
            </Button>
            
            <div className="text-sm text-gray-600">
              <p><strong>{safeT('backup.currentBackend', 'Backend aktual')}:</strong> {api.defaults.baseURL}</p>
              <p><strong>{safeT('backup.status', 'Status')}:</strong> {connectionStatus}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageLoader text="Duke ngarkuar backup..." />;
  }

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">{safeT('backup.accessRestricted', 'Akses i Kufizuar')}</h1>
          <p className="text-red-600">{safeT('backup.accessRestrictedMessage', 'Vetëm adminët dhe menaxherët mund të aksesojnë këtë faqe.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl shadow-lg p-8 border border-blue-200">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 rounded-xl p-3 shadow-sm">
            <span className="text-3xl">💾</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700">
              {safeT('backup.title', 'Menaxhimi i Backup-ve')}
            </h1>
            <p className="text-lg text-purple-700 mt-1">
              {safeT('backup.subtitle', 'Siguroni dhe menaxhoni të dhënat e sistemit')}
            </p>
          </div>
        </div>
      </div>

      {/* Statusi i Databazës */}
      {databaseStatus && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 {safeT('backup.databaseStatus', 'Statusi i Databazës')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {databaseStatus.database?.name || 'N/A'}
                </div>
                <div className="text-sm text-blue-800">{safeT('backup.databaseName', 'Emri i Databazës')}</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {databaseStatus.database?.status || 'N/A'}
                </div>
                <div className="text-sm text-green-800">{safeT('backup.status', 'Statusi')}</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {databaseStatus.backup?.exists ? '✅' : '❌'}
                </div>
                <div className="text-sm text-purple-800">{safeT('backup.backupDirectory', 'Direktoria e Backup-ve')}</div>
              </div>
            </div>
            
            {/* Database Version Info */}
            {databaseStatus.database?.version && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">ℹ️ {safeT('backup.detailedInfo', 'Informacione të Detajuara')}:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                                      <p><strong>{safeT('backup.version', 'Versioni')}:</strong> {databaseStatus.database.version}</p>
                    <p><strong>{safeT('backup.backupDirectory', 'Direktoria e Backup-ve')}:</strong> {databaseStatus.backup?.directory || 'N/A'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabelat e Databazës */}
      <Card className="mb-6">
        <CardHeader>
                      <CardTitle className="flex items-center gap-2">
              🗄️ {safeT('backup.databaseTables', 'Tabelat e Databazës')}
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {availableTables.map((table) => (
              <div key={table.name} className="group relative">
                <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 rounded-xl border border-blue-200 hover:border-blue-400 transition-all duration-300 hover:shadow-lg cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{table.icon}</span>
                    <div className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">
                      {table.name}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-700 mb-1">
                      {table.count !== undefined ? table.count : '...'}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {table.label}
                    </div>
                  </div>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Loading state for table counts */}
          {availableTables.some(table => table.count === 0) && (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500">{safeT('backup.loadingRecordCount', 'Duke ngarkuar numrin e regjistrimeve...')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aksionet e Backup */}
      <Card>
        <CardHeader>
                      <CardTitle className="flex items-center gap-2">
              🔄 {safeT('backup.backupActions', 'Aksionet e Backup')}
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Backup i Plotë */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
              <h3 className="text-xl font-bold text-blue-800 mb-4">{safeT('backup.fullBackup', 'Backup i Plotë')}</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                                      placeholder={safeT('backup.backupDescription', 'Përshkrimi i backup (opsional)')}
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  className="flex-1 p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  onClick={createFullBackup}
                  disabled={creatingBackup}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
                >
                  {creatingBackup ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {safeT('backup.creating', 'Duke krijuar...')}
                    </>
                  ) : (
                    safeT('backup.createFullBackup', '🔄 Krijo Backup të Plotë')
                  )}
                </Button>
              </div>
            </div>

            {/* Backup i Pjesshëm */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-4">{safeT('backup.partialBackup', 'Backup i Pjesshëm')}</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => setShowPartialBackupModal(true)}
                  className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:from-green-600 hover:to-blue-600 transition-all"
                >
                  {safeT('backup.createPartialBackup', '📋 Krijo Backup të Pjesshëm')}
                </Button>
                <Button
                  onClick={cleanupOldBackups}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:from-orange-600 hover:to-red-600 transition-all"
                >
                  {safeT('backup.cleanupOldBackups', '🧹 Pastro Backup të Vjetër')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista e Backup-ve */}
      <Card>
        <CardHeader>
                      <CardTitle className="flex items-center gap-2">
              📋 {safeT('backup.backupList', 'Lista e Backup-ve')} ({backups.length})
            </CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">{safeT('backup.noBackups', 'Nuk ka backup')}</h3>
              <p className="text-gray-500">{safeT('backup.noBackupsMessage', 'Krijo backup të parë për të parë listën')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge 
                          status={backup.type === 'full' ? 'full' : 'partial'} 
                        />
                        <span className="font-bold text-lg">{backup.filename}</span>
                      </div>
                      <div className="text-gray-600 mb-2">
                        {backup.description || 'Pa përshkrim'}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>📅 {formatDate(backup.timestamp)}</span>
                        <span>📊 {formatFileSize(backup.size)}</span>
                        {backup.tables && (
                          <span>📋 {backup.tables.length} tabela</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => downloadBackup(backup.filename)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        {safeT('backup.download', '⬇️ Shkarko')}
                      </Button>
                      {user?.role === 'admin' && (
                        <>
                          <Button
                            onClick={() => restoreBackup(backup.filename)}
                            disabled={restoringBackup === backup.filename}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                          >
                            {restoringBackup === backup.filename ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                {safeT('backup.restoring', 'Duke restauruar...')}
                              </>
                            ) : (
                              safeT('backup.restore', '🔄 Restore')
                            )}
                          </Button>
                          <Button
                            onClick={() => deleteBackup(backup.filename)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                          >
                                                          {safeT('backup.delete', '🗑️ Fshi')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal për Backup të Pjesshëm */}
      {showPartialBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{safeT('backup.partialBackupModal', 'Krijo Backup të Pjesshëm')}</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {safeT('backup.selectTables', 'Zgjidhni tabelat:')}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {availableTables.map((table) => (
                  <label key={table.name} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(table.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTables([...selectedTables, table.name]);
                        } else {
                          setSelectedTables(selectedTables.filter(t => t !== table.name));
                        }
                      }}
                      className="mr-3"
                    />
                    <span className="text-lg mr-2">{table.icon}</span>
                    <span className="font-medium">{table.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                  {safeT('backup.descriptionOptional', 'Përshkrimi (opsional):')}
                </label>
              <input
                type="text"
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
                                  placeholder={safeT('backup.partialBackupDescription', 'Përshkrimi i backup të pjesshëm')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={createPartialBackup}
                disabled={creatingBackup || selectedTables.length === 0}
                className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                                  {creatingBackup ? safeT('backup.creating', 'Duke krijuar...') : safeT('backup.createBackup', 'Krijo Backup')}
              </Button>
              <Button
                onClick={() => {
                  setShowPartialBackupModal(false);
                  setSelectedTables([]);
                  setBackupDescription("");
                }}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors"
              >
                                  {safeT('backup.cancel', 'Anulo')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
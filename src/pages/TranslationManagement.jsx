import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  Globe, 
  Database, 
  Languages, 
  FileText, 
  Users, 
  Building2, 
  CheckSquare,
  Edit3,
  Save,
  X,
  RefreshCw,
  Download,
  Upload,
  BarChart3
} from 'lucide-react';
import api from '../api';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Container, Grid } from '../components/ui/Layout';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TranslationManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedTable, setSelectedTable] = useState('employees');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [translations, setTranslations] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [languages, setLanguages] = useState(['sq', 'en']);

  const tables = [
    { id: 'employees', name: 'Punëtorët', icon: Users },
    { id: 'contracts', name: 'Kontratat', icon: Building2 },
    { id: 'tasks', name: 'Detyrat', icon: CheckSquare }
  ];

  // Initialize translations table
  const initializeTranslations = async () => {
    try {
      setInitializing(true);
      const response = await api.post('/api/translations/initialize');
      
      if (response.data.success) {
        alert('Tabela e përkthimeve u inicializua me sukses!');
        await loadStats();
        await loadRecords();
      }
    } catch (error) {
      console.error('Error initializing translations:', error);
      alert('Gabim gjatë inicializimit të tabelës së përkthimeve');
    } finally {
      setInitializing(false);
    }
  };

  // Migrate existing data
  const migrateData = async () => {
    try {
      setMigrating(true);
      const response = await api.post('/api/translations/migrate');
      
      if (response.data.success) {
        alert('Migrimi i të dhënave u krye me sukses!');
        await loadStats();
        await loadRecords();
      }
    } catch (error) {
      console.error('Error migrating data:', error);
      alert('Gabim gjatë migrimit të të dhënave');
    } finally {
      setMigrating(false);
    }
  };

  // Load translation statistics
  const loadStats = async () => {
    try {
      const response = await api.get('/api/translations/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load records for selected table
  const loadRecords = async () => {
    try {
      setLoading(true);
      let response;
      
      switch (selectedTable) {
        case 'employees':
          response = await api.get('/api/employees');
          break;
        case 'contracts':
          response = await api.get('/api/contracts');
          break;
        case 'tasks':
          response = await api.get('/api/tasks');
          break;
        default:
          return;
      }
      
      setRecords(response.data || []);
      
      if (response.data && response.data.length > 0) {
        await loadTranslations(response.data.map(r => r.id));
      }
      
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load translations for multiple records
  const loadTranslations = async (recordIds) => {
    try {
      const response = await api.post('/api/translations/batch', {
        tableName: selectedTable,
        recordIds,
        language: 'en' // Load English translations for editing
      });
      
      setTranslations(response.data.translations || {});
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  };

  // Start editing a field
  const startEditing = (recordId, fieldName, currentValue) => {
    setEditingField({ recordId, fieldName });
    setEditValue(currentValue || '');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Save translation
  const saveTranslation = async () => {
    if (!editingField) return;
    
    try {
      const response = await api.post('/api/translations', {
        tableName: selectedTable,
        recordId: editingField.recordId,
        fieldName: editingField.fieldName,
        languageCode: 'en',
        translatedValue: editValue
      });
      
      if (response.data.success) {
        // Update local state
        if (!translations[editingField.recordId]) {
          translations[editingField.recordId] = {};
        }
        translations[editingField.recordId][editingField.fieldName] = editValue;
        setTranslations({ ...translations });
        
        setEditingField(null);
        setEditValue('');
        
        // Reload stats
        await loadStats();
      }
    } catch (error) {
      console.error('Error saving translation:', error);
      alert('Gabim gjatë ruajtjes së përkthimit');
    }
  };

  // Export translations to CSV
  const exportTranslations = () => {
    try {
      const csvData = [];
      
      // Add headers
      csvData.push(['Table', 'Record ID', 'Field', 'Albanian', 'English']);
      
      // Add data
      Object.keys(translations).forEach(recordId => {
        Object.keys(translations[recordId]).forEach(fieldName => {
          const record = records.find(r => r.id == recordId);
          const albanianValue = record ? record[fieldName] : '';
          const englishValue = translations[recordId][fieldName] || '';
          
          csvData.push([selectedTable, recordId, fieldName, albanianValue, englishValue]);
        });
      });
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_translations.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting translations:', error);
      alert('Gabim gjatë eksportimit');
    }
  };

  // Load initial data
  useEffect(() => {
    loadStats();
    loadRecords();
  }, [selectedTable]);

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <Container>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Akses i kufizuar
          </h1>
          <p className="text-gray-600">
            Vetëm administratorët mund të aksesojnë këtë faqe.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Menaxhimi i Përkthimeve
            </h1>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={initializeTranslations}
              disabled={initializing}
              className="bg-green-600 hover:bg-green-700"
            >
              {initializing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {initializing ? 'Duke inicializuar...' : 'Inicializo Tabelën'}
            </Button>
            
            <Button
              onClick={migrateData}
              disabled={migrating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {migrating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {migrating ? 'Duke migruar...' : 'Migro të Dhënat'}
            </Button>
            
            <Button
              onClick={exportTranslations}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Download className="w-4 h-4" />
              Eksporto CSV
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Statistikat e Përkthimeve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat) => (
                  <div key={stat.language_code} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stat.language_code === 'sq' ? '🇦🇱 Shqip' : '🇬🇧 Anglisht'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {stat.completed_translations} / {stat.total_translations} të përfunduara
                    </div>
                    <div className="text-lg font-semibold text-green-600 mt-2">
                      {Math.round((stat.completed_translations / stat.total_translations) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Zgjidh Tabelën</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tables.map((table) => {
                const Icon = table.icon;
                return (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTable === table.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-medium">{table.name}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Records and Translations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {tables.find(t => t.id === selectedTable)?.name} - Përkthimet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fusha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vlera në Shqip
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vlera në Anglisht
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Veprime
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => {
                      const recordTranslations = translations[record.id] || {};
                      const translatableFields = ['name', 'title', 'description', 'position', 'company', 'address', 'category'];
                      
                      return translatableFields.map((field) => {
                        if (!record[field]) return null;
                        
                        const isEditing = editingField?.recordId === record.id && editingField?.fieldName === field;
                        const englishValue = recordTranslations[field] || '';
                        
                        return (
                          <tr key={`${record.id}-${field}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {record.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {field}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record[field]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Shkruani përkthimin në anglisht..."
                                />
                              ) : (
                                <span className={englishValue ? 'text-green-600' : 'text-red-600'}>
                                  {englishValue || 'Pa përkthim'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveTranslation}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditing(record.id, field, englishValue)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default TranslationManagement;
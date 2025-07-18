import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Mail, Smartphone, Settings, Save, X, Shield, Users, FileText, Clock, AlertTriangle } from 'lucide-react';
import api from '../api';

const NotificationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    contractNotifications: true,
    paymentNotifications: true,
    taskNotifications: true,
    workHoursReminders: true,
    invoiceReminders: true,
    expenseReminders: true,
    systemNotifications: true,
    employeeNotifications: true,
    maintenanceNotifications: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Merr settings nga backend
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/settings');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Gabim në marrjen e settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ruaj settings
  const saveSettings = async () => {
    try {
      setLoading(true);
      await api.put('/api/notifications/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Gabim në ruajtjen e settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Merr settings kur komponenti mountohet
  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleQuietHoursChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }));
  };

  // Përcakto cilat njoftime janë të disponueshme për secilin rol
  const getAvailableNotifications = () => {
    const baseNotifications = {
      contractNotifications: { label: 'Kontratat', icon: FileText, description: 'Njoftimet për kontratat e reja dhe përditësimet' },
      paymentNotifications: { label: 'Pagesat', icon: Mail, description: 'Njoftimet për pagesat e reja dhe konfirmimet' },
      taskNotifications: { label: 'Detyrat', icon: Clock, description: 'Njoftimet për detyrat e reja dhe përfundimet' },
      workHoursReminders: { label: 'Orët e punës', icon: Clock, description: 'Kujtues për paraqitjen e orëve të punës' },
      systemNotifications: { label: 'Sistemi', icon: Settings, description: 'Njoftimet e sistemit dhe mirëmbajtjes' }
    };

    if (user?.role === 'admin') {
      return {
        ...baseNotifications,
        invoiceReminders: { label: 'Faturat', icon: FileText, description: 'Kujtues për faturat e papaguara' },
        expenseReminders: { label: 'Shpenzimet', icon: AlertTriangle, description: 'Kujtues për shpenzimet e papaguara' },
        employeeNotifications: { label: 'Punonjësit', icon: Users, description: 'Njoftimet për punonjësit e rinj dhe përditësimet' },
        maintenanceNotifications: { label: 'Mirëmbajtja', icon: Shield, description: 'Njoftimet për mirëmbajtjen e sistemit' }
      };
    } else if (user?.role === 'manager') {
      return {
        ...baseNotifications,
        employeeNotifications: { label: 'Punonjësit', icon: Users, description: 'Njoftimet për përditësimet e punonjësve' }
      };
    } else {
      return baseNotifications;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const availableNotifications = getAvailableNotifications();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Settings size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Konfigurimi i Njoftimeve</h1>
            <p className="text-gray-600">Përshtatni preferencat tuaja për njoftimet</p>
            <p className="text-sm text-blue-600 mt-1">
              Roli juaj: <span className="font-semibold capitalize">{user?.role}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-green-800 font-medium">Konfigurimi u ruajt me sukses!</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification Channels */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell size={20} className="text-blue-600" />
            Kanalet e Njoftimeve
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Njoftimet në Email</p>
                  <p className="text-sm text-gray-600">Merr njoftimet në email-in tuaj</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone size={20} className="text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">Njoftimet në kohë reale në browser</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={20} className="text-purple-600" />
            Llojet e Njoftimeve
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(availableNotifications).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <IconComponent size={20} className="text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">{config.label}</p>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) => handleSettingChange(key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-orange-600" />
            Orët e Qetësisë
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Aktivizo orët e qetësisë</p>
                <p className="text-sm text-gray-600">Mos prano njoftime në këto orë</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.quietHours.enabled}
                  onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fillimi</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fundi</label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={saveSettings}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={20} />
          {loading ? 'Duke ruajtur...' : 'Ruaj Konfigurimin'}
        </button>
      </div>

      {/* Role-specific Information */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">ℹ️ Informacion për rolin tuaj</h3>
        {user?.role === 'admin' && (
          <div className="text-blue-800">
            <p className="mb-2">Si administrator, ju merrni njoftimet më të plota:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Kontratat e reja dhe përditësimet</li>
              <li>Pagesat dhe konfirmimet</li>
              <li>Punonjësit e rinj dhe përditësimet</li>
              <li>Faturat dhe shpenzimet e papaguara</li>
              <li>Mirëmbajtjen e sistemit</li>
              <li>Detyrat dhe orët e punës</li>
            </ul>
          </div>
        )}
        {user?.role === 'manager' && (
          <div className="text-blue-800">
            <p className="mb-2">Si menaxher, ju merrni njoftimet për:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Kontratat e caktuara për ju</li>
              <li>Detyrat e punonjësve tuaj</li>
              <li>Orët e punës që presin aprobim</li>
              <li>Përditësimet e punonjësve</li>
              <li>Pagesat e konfirmuara</li>
            </ul>
          </div>
        )}
        {user?.role === 'user' && (
          <div className="text-blue-800">
            <p className="mb-2">Si përdorues, ju merrni njoftimet për:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Detyrat e caktuara për ju</li>
              <li>Orët e punës dhe kujtues</li>
              <li>Pagesat e konfirmuara</li>
              <li>Përditësimet e kontratave</li>
              <li>Njoftimet e sistemit</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;
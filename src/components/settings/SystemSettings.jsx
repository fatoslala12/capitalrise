import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import toast from 'react-hot-toast';

const SystemSettings = () => {
  const { user, hasPermission } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company Information State
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    logo: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    taxNumber: '',
    registrationNumber: ''
  });

  // Work Hours Rules State
  const [workHoursRules, setWorkHoursRules] = useState({
    standardHoursPerDay: 8,
    standardHoursPerWeek: 40,
    overtimeThreshold: 40,
    overtimeMultiplier: 1.5,
    breakTimeMinutes: 30,
    maxHoursPerDay: 12,
    weekendWorkAllowed: false,
    holidayWorkAllowed: false,
    nightShiftStart: '22:00',
    nightShiftEnd: '06:00',
    nightShiftMultiplier: 1.25
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    twoFactorAuthRequired: false,
    passwordExpiryDays: 90,
    requirePasswordChangeOnFirstLogin: true
  });

  // Backup Settings State
  const [backupSettings, setBackupSettings] = useState({
    autoBackupEnabled: true,
    backupFrequency: 'daily', // daily, weekly, monthly
    backupTime: '02:00',
    backupRetentionDays: 30,
    backupLocation: 'local', // local, cloud, both
    includeUserData: true,
    includeSystemData: true,
    backupCompression: true,
    backupEncryption: false
  });

  // System Performance Settings State
  const [performanceSettings, setPerformanceSettings] = useState({
    cacheEnabled: true,
    cacheExpirationMinutes: 60,
    maxConcurrentUsers: 100,
    sessionCleanupInterval: 30,
    logRetentionDays: 90,
    enableDebugMode: false,
    enableMaintenanceMode: false,
    systemOptimization: true,
    memoryLimit: 512, // MB
    cpuLimit: 80 // percentage
  });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSecure: true,
    fromEmail: '',
    fromName: 'Capital Rise System',
    emailQueueEnabled: true,
    maxEmailsPerHour: 100,
    emailRetryAttempts: 3
  });

  // System Maintenance State
  const [maintenanceSettings, setMaintenanceSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: 'System is under maintenance. Please try again later.',
    scheduledMaintenance: false,
    maintenanceStartTime: '',
    maintenanceEndTime: '',
    autoRestartEnabled: false,
    restartTime: '03:00',
    healthCheckInterval: 5, // minutes
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90
    }
  });

  // Load settings on component mount
  useEffect(() => {
    if (hasPermission('manage_system')) {
      loadSettings();
    }
  }, [hasPermission]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/settings/system');
      const data = response.data;
      
      setCompanyInfo(data.companyInfo || companyInfo);
      setWorkHoursRules(data.workHoursRules || workHoursRules);
      setSecuritySettings(data.securitySettings || securitySettings);
      setBackupSettings(data.backupSettings || backupSettings);
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast.error(t('settings.errorLoadingSettings'));
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settingsType, data) => {
    try {
      setSaving(true);
      await api.put(`/api/settings/system/${settingsType}`, data);
      toast.success(t('settings.settingsSaved'));
    } catch (error) {
      console.error(`Error saving ${settingsType} settings:`, error);
      toast.error(t('settings.errorSavingSettings'));
    } finally {
      setSaving(false);
    }
  };

  const handleCompanyInfoSave = () => {
    saveSettings('company', companyInfo);
  };

  const handleWorkHoursRulesSave = () => {
    saveSettings('workhours', workHoursRules);
  };

  const handleSecuritySettingsSave = () => {
    saveSettings('security', securitySettings);
  };

  const handleBackupSettingsSave = () => {
    saveSettings('backup', backupSettings);
  };

  const handlePerformanceSettingsSave = () => {
    saveSettings('performance', performanceSettings);
  };

  const handleEmailSettingsSave = () => {
    saveSettings('email', emailSettings);
  };

  const handleMaintenanceSettingsSave = () => {
    saveSettings('maintenance', maintenanceSettings);
  };

  // Check if user has admin permissions
  if (!hasPermission('manage_system')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('settings.accessDenied')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('settings.adminAccessRequired')}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#32938b]/5 via-white to-[#2a6b66]/5 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10 rounded-2xl p-6 sm:p-8 border border-[#32938b]/20">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#32938b] to-[#2a6b66] mb-2">
              {t('settings.systemSettings')}
            </h1>
            <p className="text-[#2a6b66]/80 dark:text-gray-300">
              {t('settings.systemSettingsDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* System Status Overview */}
          <div className="bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10 rounded-xl p-6 border border-[#32938b]/20">
            <h2 className="text-xl font-semibold text-[#32938b] mb-4 flex items-center gap-2">
              <span>📊</span>
              System Status Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#32938b]">99.9%</div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">45ms</div>
                <div className="text-sm text-gray-600">Response Time</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">1.2GB</div>
                <div className="text-sm text-gray-600">Memory Usage</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">23%</div>
                <div className="text-sm text-gray-600">CPU Usage</div>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🏢</span>
                {t('settings.companyInformation')}
              </h2>
              <button
                onClick={handleCompanyInfoSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#32938b] to-[#2a6b66] hover:from-[#2a6b66] hover:to-[#1c514f] disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('common.saving')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>💾</span>
                    {t('common.save')}
                  </div>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.companyName')} *
                </label>
                <input
                  type="text"
                  value={companyInfo.name}
                  onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  placeholder={t('settings.enterCompanyName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.taxNumber')}
                </label>
                <input
                  type="text"
                  value={companyInfo.taxNumber}
                  onChange={(e) => setCompanyInfo({...companyInfo, taxNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  placeholder={t('settings.enterTaxNumber')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.email')}
                </label>
                <input
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  placeholder={t('settings.enterEmail')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.phone')}
                </label>
                <input
                  type="tel"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  placeholder={t('settings.enterPhone')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.address')}
                </label>
                <input
                  type="text"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  placeholder={t('settings.enterAddress')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.city')}
                </label>
                <input
                  type="text"
                  value={companyInfo.city}
                  onChange={(e) => setCompanyInfo({...companyInfo, city: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  placeholder={t('settings.enterCity')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.country')}
                </label>
                <input
                  type="text"
                  value={companyInfo.country}
                  onChange={(e) => setCompanyInfo({...companyInfo, country: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  placeholder={t('settings.enterCountry')}
                />
              </div>
            </div>
          </div>

          {/* Work Hours Rules */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🕒</span>
                {t('settings.workHoursRules')}
              </h2>
              <button
                onClick={handleWorkHoursRulesSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#32938b] to-[#2a6b66] hover:from-[#2a6b66] hover:to-[#1c514f] disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.standardHoursPerDay')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={workHoursRules.standardHoursPerDay}
                  onChange={(e) => setWorkHoursRules({...workHoursRules, standardHoursPerDay: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.standardHoursPerWeek')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={workHoursRules.standardHoursPerWeek}
                  onChange={(e) => setWorkHoursRules({...workHoursRules, standardHoursPerWeek: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.overtimeThreshold')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={workHoursRules.overtimeThreshold}
                  onChange={(e) => setWorkHoursRules({...workHoursRules, overtimeThreshold: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.overtimeMultiplier')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={workHoursRules.overtimeMultiplier}
                  onChange={(e) => setWorkHoursRules({...workHoursRules, overtimeMultiplier: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.breakTimeMinutes')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={workHoursRules.breakTimeMinutes}
                  onChange={(e) => setWorkHoursRules({...workHoursRules, breakTimeMinutes: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.maxHoursPerDay')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={workHoursRules.maxHoursPerDay}
                  onChange={(e) => setWorkHoursRules({...workHoursRules, maxHoursPerDay: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('settings.weekendWorkAllowed')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.weekendWorkAllowedDesc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workHoursRules.weekendWorkAllowed}
                        onChange={(e) => setWorkHoursRules({...workHoursRules, weekendWorkAllowed: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('settings.holidayWorkAllowed')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.holidayWorkAllowedDesc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workHoursRules.holidayWorkAllowed}
                        onChange={(e) => setWorkHoursRules({...workHoursRules, holidayWorkAllowed: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🔒</span>
                {t('settings.securitySettings')}
              </h2>
              <button
                onClick={handleSecuritySettingsSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#32938b] to-[#2a6b66] hover:from-[#2a6b66] hover:to-[#1c514f] disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.passwordMinLength')}
                </label>
                <input
                  type="number"
                  min="6"
                  max="32"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.sessionTimeoutMinutes')}
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={securitySettings.sessionTimeoutMinutes}
                  onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeoutMinutes: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.maxLoginAttempts')}
                </label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('settings.passwordRequireUppercase')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.passwordRequireUppercaseDesc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordRequireUppercase}
                        onChange={(e) => setSecuritySettings({...securitySettings, passwordRequireUppercase: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('settings.twoFactorAuthRequired')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.twoFactorAuthRequiredDesc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings.twoFactorAuthRequired}
                        onChange={(e) => setSecuritySettings({...securitySettings, twoFactorAuthRequired: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>💾</span>
                {t('settings.backupSettings')}
              </h2>
              <button
                onClick={handleBackupSettingsSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#32938b] to-[#2a6b66] hover:from-[#2a6b66] hover:to-[#1c514f] disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.backupFrequency')}
                </label>
                <select
                  value={backupSettings.backupFrequency}
                  onChange={(e) => setBackupSettings({...backupSettings, backupFrequency: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                >
                  <option value="daily">{t('settings.daily')}</option>
                  <option value="weekly">{t('settings.weekly')}</option>
                  <option value="monthly">{t('settings.monthly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.backupTime')}
                </label>
                <input
                  type="time"
                  value={backupSettings.backupTime}
                  onChange={(e) => setBackupSettings({...backupSettings, backupTime: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.backupRetentionDays')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={backupSettings.backupRetentionDays}
                  onChange={(e) => setBackupSettings({...backupSettings, backupRetentionDays: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('settings.autoBackupEnabled')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.autoBackupEnabledDesc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={backupSettings.autoBackupEnabled}
                        onChange={(e) => setBackupSettings({...backupSettings, autoBackupEnabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('settings.backupCompression')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.backupCompressionDesc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={backupSettings.backupCompression}
                        onChange={(e) => setBackupSettings({...backupSettings, backupCompression: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>⚡</span>
                {t('settings.performanceSettings')}
              </h2>
              <button
                onClick={handlePerformanceSettingsSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#32938b] to-[#2a6b66] hover:from-[#2a6b66] hover:to-[#1c514f] disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.maxConcurrentUsers')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={performanceSettings.maxConcurrentUsers}
                  onChange={(e) => setPerformanceSettings({...performanceSettings, maxConcurrentUsers: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.cacheExpirationMinutes')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={performanceSettings.cacheExpirationMinutes}
                  onChange={(e) => setPerformanceSettings({...performanceSettings, cacheExpirationMinutes: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.memoryLimit')} (MB)
                </label>
                <input
                  type="number"
                  min="128"
                  max="4096"
                  value={performanceSettings.memoryLimit}
                  onChange={(e) => setPerformanceSettings({...performanceSettings, memoryLimit: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('settings.cacheEnabled')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.cacheEnabledDesc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={performanceSettings.cacheEnabled}
                        onChange={(e) => setPerformanceSettings({...performanceSettings, cacheEnabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {t('settings.enableDebugMode')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.enableDebugModeDesc')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={performanceSettings.enableDebugMode}
                        onChange={(e) => setPerformanceSettings({...performanceSettings, enableDebugMode: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📧</span>
                {t('settings.emailSettings')}
              </h2>
              <button
                onClick={handleEmailSettingsSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#32938b] to-[#2a6b66] hover:from-[#2a6b66] hover:to-[#1c514f] disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.smtpHost')}
                </label>
                <input
                  type="text"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.smtpPort')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpPort: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.smtpUsername')}
                </label>
                <input
                  type="text"
                  value={emailSettings.smtpUsername}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpUsername: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.smtpPassword')}
                </label>
                <input
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={(e) => setEmailSettings({...emailSettings, smtpPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.fromEmail')}
                </label>
                <input
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings({...emailSettings, fromEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.fromName')}
                </label>
                <input
                  type="text"
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings({...emailSettings, fromName: e.target.value})}
                  className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#32938b] dark:text-[#32938b] flex items-center gap-2">
                <span>⚡</span>
                Quick Actions
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="p-4 bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10 hover:from-[#32938b]/20 hover:to-[#2a6b66]/20 rounded-lg border border-[#32938b]/20 transition-all duration-300 hover:scale-105">
                <div className="text-2xl mb-2">🔄</div>
                <div className="font-medium text-[#32938b]">Restart System</div>
                <div className="text-sm text-gray-600">Restart all services</div>
              </button>
              
              <button className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-lg border border-emerald-200 transition-all duration-300 hover:scale-105">
                <div className="text-2xl mb-2">💾</div>
                <div className="font-medium text-emerald-800">Create Backup</div>
                <div className="text-sm text-emerald-600">Manual backup now</div>
              </button>
              
              <button className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border border-blue-200 transition-all duration-300 hover:scale-105">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium text-blue-800">View Logs</div>
                <div className="text-sm text-blue-600">System logs</div>
              </button>
              
              <button className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg border border-orange-200 transition-all duration-300 hover:scale-105">
                <div className="text-2xl mb-2">🔧</div>
                <div className="font-medium text-orange-800">Maintenance</div>
                <div className="text-sm text-orange-600">System maintenance</div>
              </button>
            </div>
          </div>

          {/* System Maintenance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🔧</span>
                {t('settings.systemMaintenance')}
              </h2>
              <button
                onClick={handleMaintenanceSettingsSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#32938b] to-[#2a6b66] hover:from-[#2a6b66] hover:to-[#1c514f] disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    {t('settings.maintenanceMode')}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-300">
                    {t('settings.maintenanceModeDesc')}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.maintenanceMode}
                    onChange={(e) => setMaintenanceSettings({...maintenanceSettings, maintenanceMode: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.maintenanceMessage')}
                  </label>
                  <textarea
                    value={maintenanceSettings.maintenanceMessage}
                    onChange={(e) => setMaintenanceSettings({...maintenanceSettings, maintenanceMessage: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.healthCheckInterval')} (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={maintenanceSettings.healthCheckInterval}
                    onChange={(e) => setMaintenanceSettings({...maintenanceSettings, healthCheckInterval: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.cpuUsageThreshold')} (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maintenanceSettings.alertThresholds.cpuUsage}
                    onChange={(e) => setMaintenanceSettings({
                      ...maintenanceSettings, 
                      alertThresholds: {...maintenanceSettings.alertThresholds, cpuUsage: parseInt(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.memoryUsageThreshold')} (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maintenanceSettings.alertThresholds.memoryUsage}
                    onChange={(e) => setMaintenanceSettings({
                      ...maintenanceSettings, 
                      alertThresholds: {...maintenanceSettings.alertThresholds, memoryUsage: parseInt(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.diskUsageThreshold')} (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maintenanceSettings.alertThresholds.diskUsage}
                    onChange={(e) => setMaintenanceSettings({
                      ...maintenanceSettings, 
                      alertThresholds: {...maintenanceSettings.alertThresholds, diskUsage: parseInt(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;

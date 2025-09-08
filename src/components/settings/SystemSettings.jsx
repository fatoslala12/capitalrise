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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('settings.systemSettings')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('settings.systemSettingsDescription')}
          </p>
        </div>

        <div className="space-y-8">
          {/* Company Information */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🏢</span>
                {t('settings.companyInformation')}
              </h2>
              <button
                onClick={handleCompanyInfoSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors duration-200"
              >
                {saving ? t('common.saving') : t('common.save')}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('settings.enterCountry')}
                />
              </div>
            </div>
          </div>

          {/* Work Hours Rules */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🕒</span>
                {t('settings.workHoursRules')}
              </h2>
              <button
                onClick={handleWorkHoursRulesSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors duration-200"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🔒</span>
                {t('settings.securitySettings')}
              </h2>
              <button
                onClick={handleSecuritySettingsSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors duration-200"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>💾</span>
                {t('settings.backupSettings')}
              </h2>
              <button
                onClick={handleBackupSettingsSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors duration-200"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
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

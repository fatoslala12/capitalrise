import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SystemSettings from '../components/settings/SystemSettings';
import ThemeCustomizer from '../components/settings/ThemeCustomizer';

const Settings = () => {
  const { theme, setTheme, currentTheme, isDark, isLight } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('appearance');

  const tabs = [
    { id: 'appearance', label: t('theme.appearance'), icon: '🎨' },
    { id: 'customize', label: t('settings.customizeTheme'), icon: '🎨' },
    { id: 'profile', label: t('profile.title'), icon: '👤' },
    { id: 'notifications', label: t('notifications.title'), icon: '🔔' },
    { id: 'privacy', label: t('privacy.title'), icon: '🔒' },
    ...(user?.role === 'admin' ? [{ id: 'system', label: t('settings.systemSettings'), icon: '⚙️' }] : []),
  ];

  const themeOptions = [
    { value: 'light', label: t('theme.lightMode'), icon: '☀️' },
    { value: 'dark', label: t('theme.darkMode'), icon: '🌙' },
    { value: 'green', label: t('theme.greenMode'), icon: '🌿' },
    { value: 'green-dark', label: t('theme.greenDarkMode'), icon: '🌙🌿' },
    { value: 'auto', label: t('theme.autoMode'), icon: '🔄' },
  ];

  const languageOptions = [
    { value: 'sq', label: 'Shqip', flag: '🇦🇱' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const renderAppearanceTab = () => (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-slate-700">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <span>🎨</span>
          {t('theme.colorScheme')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`rounded-2xl border transition-all duration-200 p-6 text-left hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                theme === option.value || (option.value === 'auto' && !localStorage.getItem('theme'))
                  ? 'border-sky-400 ring-2 ring-sky-200 bg-sky-50/60 dark:bg-slate-700/40 text-sky-800 dark:text-sky-200'
                  : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl">{option.icon}</div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{option.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('theme.switchTheme')}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-slate-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <span>👁️</span>
          {t('theme.themePreference')}
        </h3>
        
        <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-700 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {user?.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="minimal" size="sm" showLabel={false} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>👤</span>
          {t('profile.personalInfo')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.firstName')}
            </label>
            <input
              type="text"
              defaultValue={user?.firstName || ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.lastName')}
            </label>
            <input
              type="text"
              defaultValue={user?.lastName || ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.email')}
            </label>
            <input
              type="email"
              defaultValue={user?.email || ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.phone')}
            </label>
            <input
              type="tel"
              defaultValue={user?.phone || ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200">
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>🔔</span>
          {t('notifications.preferences')}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {t('notifications.emailNotifications')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('notifications.emailNotificationsDesc')}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {t('notifications.pushNotifications')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('notifications.pushNotificationsDesc')}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {t('notifications.soundNotifications')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('notifications.soundNotificationsDesc')}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>🔒</span>
          {t('privacy.dataSharing')}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {t('privacy.analyticsData')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('privacy.analyticsDataDesc')}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {t('privacy.marketingEmails')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('privacy.marketingEmailsDesc')}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return renderAppearanceTab();
      case 'customize':
        return <ThemeCustomizer />;
      case 'profile':
        return renderProfileTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'privacy':
        return renderPrivacyTab();
      case 'system':
        return <SystemSettings />;
      default:
        return renderAppearanceTab();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            {t('settings.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg">
            {t('settings.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 sticky top-6">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                      ${activeTab === tab.id
                        ? 'bg-sky-50 dark:bg-slate-700/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-slate-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                      }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

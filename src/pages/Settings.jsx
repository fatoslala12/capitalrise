import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SystemSettings from '../components/settings/SystemSettings';
import ThemeCustomizer from '../components/settings/ThemeCustomizer';

const Settings = () => {
  const { theme, setTheme, currentTheme, isDark, isLight, customThemes, setActiveTheme, activeThemeData } = useTheme();
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
    // Add custom themes
    ...customThemes.map(customTheme => ({
      value: `custom-${customTheme.id}`,
      label: customTheme.name,
      icon: '🎨',
      isCustom: true,
      themeData: customTheme
    }))
  ];

  const languageOptions = [
    { value: 'sq', label: 'Shqip', flag: '🇦🇱' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];

  // Get current theme info
  const getCurrentThemeInfo = () => {
    if (activeThemeData?.type === 'preset') {
      const themeMap = {
        'light': { icon: '☀️', label: t('theme.lightMode') },
        'dark': { icon: '🌙', label: t('theme.darkMode') },
        'green': { icon: '🌿', label: t('theme.greenMode') },
        'green-dark': { icon: '🌙🌿', label: t('theme.greenDarkMode') },
        'auto': { icon: '🔄', label: t('theme.autoMode') }
      };
      return themeMap[activeThemeData.id] || { icon: '🎨', label: activeThemeData.id };
    } else if (activeThemeData?.type === 'custom') {
      return { icon: '🎨', label: activeThemeData.name };
    } else {
      const themeMap = {
        'light': { icon: '☀️', label: t('theme.lightMode') },
        'dark': { icon: '🌙', label: t('theme.darkMode') },
        'green': { icon: '🌿', label: t('theme.greenMode') },
        'green-dark': { icon: '🌙🌿', label: t('theme.greenDarkMode') },
        'auto': { icon: '🔄', label: t('theme.autoMode') }
      };
      return themeMap[theme] || { icon: '🎨', label: theme };
    }
  };

  const renderAppearanceTab = () => (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-[#32938b]/20 dark:border-slate-700 hover:shadow-2xl transition-all duration-300">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#32938b] dark:text-[#32938b] mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-xl">🎨</span>
          {t('settings.colorScheme')}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={async () => {
                if (option.isCustom) {
                  // Apply custom theme via API
                  try {
                    await setActiveTheme('custom', option.themeData.id);
                  } catch (error) {
                    console.error('Error applying custom theme:', error);
                  }
                } else {
                  setTheme(option.value);
                }
              }}
              className={`rounded-xl sm:rounded-2xl border transition-all duration-300 p-3 sm:p-4 lg:p-6 text-left hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 hover:scale-105 ${
                (activeThemeData?.type === 'preset' && activeThemeData?.id === option.value) ||
                (activeThemeData?.type === 'custom' && option.isCustom && activeThemeData?.id === option.themeData?.id) ||
                (!activeThemeData && theme === option.value) ||
                (option.value === 'auto' && !localStorage.getItem('theme') && !activeThemeData)
                  ? 'border-[#32938b] ring-2 ring-[#32938b]/20 bg-gradient-to-br from-[#32938b]/10 to-[#2a6b66]/10 dark:bg-slate-700/40 text-[#32938b] dark:text-[#32938b]'
                  : 'border-[#32938b]/30 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:border-[#32938b] dark:hover:border-[#32938b] hover:bg-gradient-to-br hover:from-[#32938b]/5 hover:to-[#2a6b66]/5'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="text-lg sm:text-xl lg:text-2xl">{option.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{option.label}</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('settings.switchTheme')}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-[#32938b]/20 dark:border-slate-700 hover:shadow-2xl transition-all duration-300">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#32938b] dark:text-[#32938b] mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-xl">👁️</span>
          {t('settings.themePreference')}
        </h3>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r from-[#32938b]/5 to-[#2a6b66]/5 dark:bg-slate-700 rounded-xl hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#32938b] to-[#2a6b66] rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0 shadow-lg">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs sm:text-sm text-[#2a6b66]/80 dark:text-gray-400 truncate">
                {user?.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-600 rounded-lg border border-[#32938b]/30 dark:border-slate-500 hover:shadow-md transition-all duration-300">
              <span className="text-sm">{getCurrentThemeInfo().icon}</span>
              <span className="text-sm font-medium text-[#32938b] dark:text-[#32938b]">
                {getCurrentThemeInfo().label}
              </span>
            </div>
            <ThemeToggle variant="minimal" size="sm" showLabel={false} />
          </div>
        </div>
      </div>
    </div>
  );


  const renderProfileTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-lg border border-[#32938b]/20 dark:border-slate-700 hover:shadow-xl transition-all duration-300">
        <h3 className="text-base sm:text-lg font-semibold text-[#32938b] dark:text-[#32938b] mb-4 flex items-center gap-2">
          <span>👤</span>
          {t('profile.personalInfo')}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.firstName')}
            </label>
            <input
              type="text"
              defaultValue={user?.firstName || ''}
              className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent text-sm sm:text-base transition-all duration-300"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.lastName')}
            </label>
            <input
              type="text"
              defaultValue={user?.lastName || ''}
              className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent text-sm sm:text-base transition-all duration-300"
              readOnly
            />
          </div>
          
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.email')}
            </label>
            <input
              type="email"
              defaultValue={user?.email || ''}
              className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent text-sm sm:text-base transition-all duration-300"
              readOnly
            />
          </div>
          
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.phone')}
            </label>
            <input
              type="tel"
              defaultValue={user?.phone || ''}
              className="w-full px-3 py-2 border border-[#32938b]/30 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-transparent text-sm sm:text-base transition-all duration-300"
              readOnly
            />
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10 dark:bg-[#32938b]/20 rounded-lg border border-[#32938b]/20">
          <p className="text-xs sm:text-sm text-[#32938b] dark:text-[#32938b]">
            <span className="font-medium">ℹ️ Info:</span> Për të ndryshuar të dhënat e profilit, kontaktoni administratorin e sistemit.
          </p>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-[#32938b]/20 dark:border-slate-700 hover:shadow-xl transition-all duration-300">
        <h3 className="text-lg font-semibold text-[#32938b] dark:text-[#32938b] mb-4 flex items-center gap-2">
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-[#32938b]/20 dark:border-slate-700 hover:shadow-xl transition-all duration-300">
        <h3 className="text-lg font-semibold text-[#32938b] dark:text-[#32938b] mb-4 flex items-center gap-2">
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#32938b]/30 dark:peer-focus:ring-[#32938b]/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#32938b]"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-[#32938b]/5 via-white to-[#2a6b66]/5 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-4 sm:py-6 lg:py-10">
      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 lg:mb-10 text-center md:text-left">
          <div className="bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10 rounded-2xl p-6 sm:p-8 border border-[#32938b]/20">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#32938b] to-[#2a6b66] mb-2 tracking-tight">
              {t('settings.title')}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-[#2a6b66]/80 dark:text-gray-300">
              {t('settings.description')}
            </p>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="lg:hidden mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#32938b]/20 dark:border-slate-700 p-4 hover:shadow-xl transition-all duration-300">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#32938b]/30 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#32938b] focus:border-[#32938b] transition-all duration-300"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.icon} {tab.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden xl:block xl:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#32938b]/20 dark:border-slate-700 p-4 lg:p-6 sticky top-6 hover:shadow-2xl transition-all duration-300">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-left transition-all duration-300 hover:scale-105
                      ${activeTab === tab.id
                        ? 'bg-gradient-to-r from-[#32938b]/10 to-[#2a6b66]/10 text-[#32938b] dark:text-[#32938b] border border-[#32938b]/30 dark:border-[#32938b]/30 shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-[#32938b]/5 hover:to-[#2a6b66]/5 hover:text-[#32938b] dark:hover:text-[#32938b]'
                      }`}
                  >
                    <span className="text-base lg:text-lg">{tab.icon}</span>
                    <span className="font-medium text-sm lg:text-base">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content - Responsive width */}
          <div className="xl:col-span-4 w-full">
            <div className="w-full">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

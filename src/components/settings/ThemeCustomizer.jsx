import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const ThemeCustomizer = () => {
  const { theme, setTheme, currentTheme, getThemeColor } = useTheme();
  const { t } = useTranslation();
  
  const [customTheme, setCustomTheme] = useState({
    name: 'Custom Theme',
    colors: {
      'bg-primary': '#ffffff',
      'bg-secondary': '#f8fafc',
      'bg-tertiary': '#f1f5f9',
      'bg-card': '#ffffff',
      'text-primary': '#1e293b',
      'text-secondary': '#475569',
      'text-tertiary': '#64748b',
      'border-primary': '#e2e8f0',
      'border-secondary': '#cbd5e1',
      'border-focus': '#3b82f6',
      'success': '#22c55e',
      'warning': '#f59e0b',
      'error': '#ef4444',
      'info': '#3b82f6',
      'menu-primary': '#3b82f6',
      'menu-secondary': '#2563eb',
      'menu-gradient-start': '#3b82f6',
      'menu-gradient-end': '#1d4ed8',
      'menu-text': '#ffffff',
      'menu-hover': 'rgba(255, 255, 255, 0.1)',
      'menu-active': 'rgba(255, 255, 255, 0.2)',
      'page-header-bg': 'rgba(255, 255, 255, 0.8)',
      'page-header-border': 'rgba(59, 130, 246, 0.2)',
      // Interactive colors
      'button-primary': '#3b82f6',
      'button-primary-hover': '#2563eb',
      'button-primary-active': '#1d4ed8',
      'button-secondary': '#6b7280',
      'button-secondary-hover': '#4b5563',
      'button-secondary-active': '#374151',
      'button-success': '#22c55e',
      'button-success-hover': '#16a34a',
      'button-success-active': '#15803d',
      'button-danger': '#ef4444',
      'button-danger-hover': '#dc2626',
      'button-danger-active': '#b91c1c',
      'button-warning': '#f59e0b',
      'button-warning-hover': '#d97706',
      'button-warning-active': '#b45309',
      // Hover states
      'hover-primary': 'rgba(59, 130, 246, 0.1)',
      'hover-secondary': 'rgba(107, 114, 128, 0.1)',
      'hover-success': 'rgba(34, 197, 94, 0.1)',
      'hover-danger': 'rgba(239, 68, 68, 0.1)',
      'hover-warning': 'rgba(245, 158, 11, 0.1)',
      // Focus states
      'focus-primary': 'rgba(59, 130, 246, 0.3)',
      'focus-secondary': 'rgba(107, 114, 128, 0.3)',
      'focus-success': 'rgba(34, 197, 94, 0.3)',
      'focus-danger': 'rgba(239, 68, 68, 0.3)',
      'focus-warning': 'rgba(245, 158, 11, 0.3)',
      // Active states
      'active-primary': 'rgba(59, 130, 246, 0.2)',
      'active-secondary': 'rgba(107, 114, 128, 0.2)',
      'active-success': 'rgba(34, 197, 94, 0.2)',
      'active-danger': 'rgba(239, 68, 68, 0.2)',
      'active-warning': 'rgba(245, 158, 11, 0.2)',
      // Link colors
      'link-primary': '#3b82f6',
      'link-primary-hover': '#2563eb',
      'link-primary-visited': '#7c3aed',
      // Input colors
      'input-bg': '#ffffff',
      'input-border': '#d1d5db',
      'input-border-focus': '#3b82f6',
      'input-border-error': '#ef4444',
      'input-text': '#1f2937',
      'input-placeholder': '#9ca3af',
      // Shadow colors
      'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    }
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [savedThemes, setSavedThemes] = useState([]);

  // Load saved themes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customThemes');
    if (saved) {
      try {
        setSavedThemes(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved themes:', error);
      }
    }
  }, []);

  // Color input component
  const ColorInput = ({ label, colorKey, description }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={customTheme.colors[colorKey]}
          onChange={(e) => setCustomTheme({
            ...customTheme,
            colors: {
              ...customTheme.colors,
              [colorKey]: e.target.value
            }
          })}
          className="w-12 h-10 rounded-lg border border-gray-300 dark:border-slate-600 cursor-pointer"
        />
        <input
          type="text"
          value={customTheme.colors[colorKey]}
          onChange={(e) => setCustomTheme({
            ...customTheme,
            colors: {
              ...customTheme.colors,
              [colorKey]: e.target.value
            }
          })}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="#000000"
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  );

  // Apply custom theme preview
  const applyPreview = () => {
    if (previewMode) {
      // Apply custom theme
      const root = document.documentElement;
      Object.entries(customTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--theme-${key}`, value);
      });
    } else {
      // Reset to current theme
      const root = document.documentElement;
      Object.entries(currentTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--theme-${key}`, value);
      });
    }
  };

  useEffect(() => {
    applyPreview();
  }, [previewMode, customTheme, currentTheme]);

  // Save custom theme
  const saveCustomTheme = () => {
    if (!customTheme.name.trim()) {
      toast.error(t('settings.themeNameRequired'));
      return;
    }

    const newTheme = {
      ...customTheme,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    const updatedThemes = [...savedThemes, newTheme];
    setSavedThemes(updatedThemes);
    localStorage.setItem('customThemes', JSON.stringify(updatedThemes));
    
    toast.success(t('settings.themeSaved'));
  };

  // Load saved theme
  const loadSavedTheme = (savedTheme) => {
    setCustomTheme(savedTheme);
    toast.success(t('settings.themeLoaded'));
  };

  // Delete saved theme
  const deleteSavedTheme = (themeId) => {
    const updatedThemes = savedThemes.filter(t => t.id !== themeId);
    setSavedThemes(updatedThemes);
    localStorage.setItem('customThemes', JSON.stringify(updatedThemes));
    toast.success(t('settings.themeDeleted'));
  };

  // Export theme
  const exportTheme = () => {
    const dataStr = JSON.stringify(customTheme, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${customTheme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success(t('settings.themeExported'));
  };

  // Import theme
  const importTheme = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTheme = JSON.parse(e.target.result);
        setCustomTheme(importedTheme);
        toast.success(t('settings.themeImported'));
      } catch (error) {
        toast.error(t('settings.invalidThemeFile'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🎨</span>
            {t('settings.customizeTheme')}
          </h2>
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.previewMode')}
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.themeName')}
            </label>
            <input
              type="text"
              value={customTheme.name}
              onChange={(e) => setCustomTheme({...customTheme, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('settings.enterThemeName')}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={saveCustomTheme}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
            >
              {t('common.save')}
            </button>
            <button
              onClick={exportTheme}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors duration-200"
            >
              {t('common.export')}
            </button>
            <label className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors duration-200 cursor-pointer">
              {t('common.import')}
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Color Customization */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🎨</span>
            {t('settings.colors')}
          </h3>

          <div className="space-y-6">
            {/* Background Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.backgroundColors')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.primaryBackground')}
                  colorKey="bg-primary"
                  description={t('settings.primaryBackgroundDesc')}
                />
                <ColorInput
                  label={t('settings.secondaryBackground')}
                  colorKey="bg-secondary"
                  description={t('settings.secondaryBackgroundDesc')}
                />
                <ColorInput
                  label={t('settings.cardBackground')}
                  colorKey="bg-card"
                  description={t('settings.cardBackgroundDesc')}
                />
              </div>
            </div>

            {/* Text Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.textColors')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.primaryText')}
                  colorKey="text-primary"
                  description={t('settings.primaryTextDesc')}
                />
                <ColorInput
                  label={t('settings.secondaryText')}
                  colorKey="text-secondary"
                  description={t('settings.secondaryTextDesc')}
                />
                <ColorInput
                  label={t('settings.tertiaryText')}
                  colorKey="text-tertiary"
                  description={t('settings.tertiaryTextDesc')}
                />
              </div>
            </div>

            {/* Status Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.statusColors')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.successColor')}
                  colorKey="success"
                  description={t('settings.successColorDesc')}
                />
                <ColorInput
                  label={t('settings.warningColor')}
                  colorKey="warning"
                  description={t('settings.warningColorDesc')}
                />
                <ColorInput
                  label={t('settings.errorColor')}
                  colorKey="error"
                  description={t('settings.errorColorDesc')}
                />
                <ColorInput
                  label={t('settings.infoColor')}
                  colorKey="info"
                  description={t('settings.infoColorDesc')}
                />
              </div>
            </div>

            {/* Menu Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.menuColors')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.menuPrimary')}
                  colorKey="menu-primary"
                  description={t('settings.menuPrimaryDesc')}
                />
                <ColorInput
                  label={t('settings.menuSecondary')}
                  colorKey="menu-secondary"
                  description={t('settings.menuSecondaryDesc')}
                />
                <ColorInput
                  label={t('settings.menuGradientStart')}
                  colorKey="menu-gradient-start"
                  description={t('settings.menuGradientStartDesc')}
                />
                <ColorInput
                  label={t('settings.menuGradientEnd')}
                  colorKey="menu-gradient-end"
                  description={t('settings.menuGradientEndDesc')}
                />
                <ColorInput
                  label={t('settings.menuText')}
                  colorKey="menu-text"
                  description={t('settings.menuTextDesc')}
                />
              </div>
            </div>

            {/* Page Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.pageColors')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.pageHeaderBg')}
                  colorKey="page-header-bg"
                  description={t('settings.pageHeaderBgDesc')}
                />
                <ColorInput
                  label={t('settings.pageHeaderBorder')}
                  colorKey="page-header-border"
                  description={t('settings.pageHeaderBorderDesc')}
                />
              </div>
            </div>

            {/* Button Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.buttonColors')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.buttonPrimary')}
                  colorKey="button-primary"
                  description={t('settings.buttonPrimaryDesc')}
                />
                <ColorInput
                  label={t('settings.buttonPrimaryHover')}
                  colorKey="button-primary-hover"
                  description={t('settings.buttonPrimaryHoverDesc')}
                />
                <ColorInput
                  label={t('settings.buttonPrimaryActive')}
                  colorKey="button-primary-active"
                  description={t('settings.buttonPrimaryActiveDesc')}
                />
                <ColorInput
                  label={t('settings.buttonSecondary')}
                  colorKey="button-secondary"
                  description={t('settings.buttonSecondaryDesc')}
                />
                <ColorInput
                  label={t('settings.buttonSuccess')}
                  colorKey="button-success"
                  description={t('settings.buttonSuccessDesc')}
                />
                <ColorInput
                  label={t('settings.buttonDanger')}
                  colorKey="button-danger"
                  description={t('settings.buttonDangerDesc')}
                />
              </div>
            </div>

            {/* Interactive States */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.interactiveStates')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.hoverPrimary')}
                  colorKey="hover-primary"
                  description={t('settings.hoverPrimaryDesc')}
                />
                <ColorInput
                  label={t('settings.focusPrimary')}
                  colorKey="focus-primary"
                  description={t('settings.focusPrimaryDesc')}
                />
                <ColorInput
                  label={t('settings.activePrimary')}
                  colorKey="active-primary"
                  description={t('settings.activePrimaryDesc')}
                />
              </div>
            </div>

            {/* Link Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.linkColors')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.linkPrimary')}
                  colorKey="link-primary"
                  description={t('settings.linkPrimaryDesc')}
                />
                <ColorInput
                  label={t('settings.linkPrimaryHover')}
                  colorKey="link-primary-hover"
                  description={t('settings.linkPrimaryHoverDesc')}
                />
                <ColorInput
                  label={t('settings.linkPrimaryVisited')}
                  colorKey="link-primary-visited"
                  description={t('settings.linkPrimaryVisitedDesc')}
                />
              </div>
            </div>

            {/* Input Colors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.inputColors')}
              </h4>
              <div className="space-y-4">
                <ColorInput
                  label={t('settings.inputBg')}
                  colorKey="input-bg"
                  description={t('settings.inputBgDesc')}
                />
                <ColorInput
                  label={t('settings.inputBorder')}
                  colorKey="input-border"
                  description={t('settings.inputBorderDesc')}
                />
                <ColorInput
                  label={t('settings.inputBorderFocus')}
                  colorKey="input-border-focus"
                  description={t('settings.inputBorderFocusDesc')}
                />
                <ColorInput
                  label={t('settings.inputText')}
                  colorKey="input-text"
                  description={t('settings.inputTextDesc')}
                />
                <ColorInput
                  label={t('settings.inputPlaceholder')}
                  colorKey="input-placeholder"
                  description={t('settings.inputPlaceholderDesc')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Theme Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>👁️</span>
            {t('settings.themePreview')}
          </h3>

          <div className="space-y-4">
            {/* Sample Card */}
            <div className="p-4 rounded-lg border" style={{
              backgroundColor: customTheme.colors['bg-card'],
              borderColor: customTheme.colors['border-primary'],
              color: customTheme.colors['text-primary']
            }}>
              <h4 className="font-semibold mb-2" style={{ color: customTheme.colors['text-primary'] }}>
                {t('settings.sampleCard')}
              </h4>
              <p className="text-sm mb-3" style={{ color: customTheme.colors['text-secondary'] }}>
                {t('settings.sampleCardDescription')}
              </p>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded text-xs" style={{
                  backgroundColor: customTheme.colors['success'] + '20',
                  color: customTheme.colors['success']
                }}>
                  {t('common.success')}
                </span>
                <span className="px-2 py-1 rounded text-xs" style={{
                  backgroundColor: customTheme.colors['warning'] + '20',
                  color: customTheme.colors['warning']
                }}>
                  {t('common.warning')}
                </span>
                <span className="px-2 py-1 rounded text-xs" style={{
                  backgroundColor: customTheme.colors['error'] + '20',
                  color: customTheme.colors['error']
                }}>
                  {t('common.error')}
                </span>
              </div>
            </div>

            {/* Sample Button */}
            <button
              className="px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              style={{
                backgroundColor: customTheme.colors['info'],
                color: '#ffffff'
              }}
            >
              {t('settings.sampleButton')}
            </button>
          </div>
        </div>
      </div>

      {/* Saved Themes */}
      {savedThemes.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>💾</span>
            {t('settings.savedThemes')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedThemes.map((savedTheme) => (
              <div
                key={savedTheme.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {savedTheme.name}
                  </h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => loadSavedTheme(savedTheme)}
                      className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      title={t('settings.loadTheme')}
                    >
                      📁
                    </button>
                    <button
                      onClick={() => deleteSavedTheme(savedTheme.id)}
                      className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title={t('settings.deleteTheme')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: savedTheme.colors['bg-primary'] }}
                  ></div>
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: savedTheme.colors['text-primary'] }}
                  ></div>
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: savedTheme.colors['info'] }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {new Date(savedTheme.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeCustomizer;

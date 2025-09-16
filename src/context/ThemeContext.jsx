import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'test1' theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    
    // Default to test1 theme for all users
    return 'test1';
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [customThemes, setCustomThemes] = useState([]);
  const [activeThemeData, setActiveThemeData] = useState(null);

  // Theme configuration
  const themes = useMemo(() => ({
    light: {
      name: 'Light',
      colors: {
        // Background colors
        'bg-primary': '#ffffff',
        'bg-secondary': '#f8fafc',
        'bg-tertiary': '#f1f5f9',
        'bg-card': '#ffffff',
        'bg-overlay': 'rgba(0, 0, 0, 0.5)',
        
        // Text colors
        'text-primary': '#1e293b',
        'text-secondary': '#475569',
        'text-tertiary': '#64748b',
        'text-inverse': '#ffffff',
        
        // Border colors
        'border-primary': '#e2e8f0',
        'border-secondary': '#cbd5e1',
        'border-focus': '#3b82f6',
        
        // Shadow colors
        'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        
        // Status colors
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#3b82f6',
        
        // Interactive colors
        'hover': 'rgba(59, 130, 246, 0.1)',
        'active': 'rgba(59, 130, 246, 0.2)',
        'focus': 'rgba(59, 130, 246, 0.3)',
        
        // Menu and page colors
        'menu-primary': '#3b82f6',
        'menu-secondary': '#2563eb',
        'menu-gradient-start': '#3b82f6',
        'menu-gradient-end': '#1d4ed8',
        'menu-text': '#ffffff',
        'menu-hover': 'rgba(255, 255, 255, 0.1)',
        'menu-active': 'rgba(255, 255, 255, 0.2)',
        'page-header-bg': 'rgba(255, 255, 255, 0.8)',
        'page-header-border': 'rgba(59, 130, 246, 0.2)',
      }
    },
    dark: {
      name: 'Dark',
      colors: {
        // Background colors
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-tertiary': '#334155',
        'bg-card': '#1e293b',
        'bg-overlay': 'rgba(0, 0, 0, 0.7)',
        
        // Text colors
        'text-primary': '#f8fafc',
        'text-secondary': '#cbd5e1',
        'text-tertiary': '#94a3b8',
        'text-inverse': '#0f172a',
        
        // Border colors
        'border-primary': '#334155',
        'border-secondary': '#475569',
        'border-focus': '#60a5fa',
        
        // Shadow colors
        'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
        'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
        'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
        
        // Status colors
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#60a5fa',
        
        // Interactive colors
        'hover': 'rgba(96, 165, 250, 0.1)',
        'active': 'rgba(96, 165, 250, 0.2)',
        'focus': 'rgba(96, 165, 250, 0.3)',
        
        // Menu and page colors
        'menu-primary': '#1e293b',
        'menu-secondary': '#334155',
        'menu-gradient-start': '#1e293b',
        'menu-gradient-end': '#0f172a',
        'menu-text': '#f8fafc',
        'menu-hover': 'rgba(255, 255, 255, 0.1)',
        'menu-active': 'rgba(255, 255, 255, 0.2)',
        'page-header-bg': 'rgba(15, 23, 42, 0.8)',
        'page-header-border': 'rgba(255, 255, 255, 0.1)',
      }
    },
    // Green Magic UI Palette - Modaliteti i Gjelbërt 🌿
    green: {
      name: 'Modaliteti i Gjelbërt',
      colors: {
        // Background colors - Ngjyrat e Sfondit
        'bg-primary': '#fdfdfc', // i bardhë i ngrohtë → shmang të bardhën e ftohtë
        'bg-secondary': '#f6f9f8', // e bardhë me nuancë jeshile → airy & moderne
        'bg-tertiary': '#f1f5f9',
        'bg-card': '#ffffff', // për contrast të pastër
        'bg-overlay': 'rgba(0, 0, 0, 0.5)',
        
        // Text colors - Ngjyrat e Tekstit
        'text-primary': '#1a1f1d', // neutral black-green → lexueshmëri perfekte
        'text-secondary': '#2e423f', // gri-jeshile e errët për tituj sekondarë
        'text-tertiary': '#6b7f7b', // muted green-gray për përshkrime
        'text-inverse': '#ffffff',
        
        // Border colors
        'border-primary': '#cbd5d1', // soft gray-green
        'border-secondary': '#cbd5e1',
        'border-focus': '#349490', // highlight turquoise 🌿
        
        // Shadow colors
        'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        
        // Status colors - Ngjyrat e Statusit
        'success': '#16a34a', // green vibrant & friendly
        'warning': '#eab308', // amber elegant
        'error': '#dc2626', // red deep & profesional
        'info': '#0ea5e9', // cyan clean & modern
        
        // Interactive colors - Ngjyrat e Butonave
        'button-primary': '#349490', // turquoise green 🌿
        'button-primary-hover': '#2e7c78',
        'button-primary-active': '#25635f',
        'button-secondary': '#6b7280', // neutral gray → balance
        'button-success': '#16a34a',
        'button-danger': '#dc2626',
        
        // Interactive states - Interactive States
        'hover-primary': 'rgba(52, 148, 144, 0.12)',
        'focus-primary': 'rgba(52, 148, 144, 0.35)',
        'active-primary': 'rgba(52, 148, 144, 0.25)',
        
        // Link colors - Ngjyrat e Linkeve
        'link-primary': '#349490', // turquoise green 🌿
        'link-primary-hover': '#27736f',
        'link-primary-visited': '#7c3aed', // accent violet → modern
        
        // Input colors - Ngjyrat e Inputeve
        'input-bg': '#ffffff',
        'input-border': '#cbd5d1', // soft gray-green
        'input-border-focus': '#349490', // highlight turquoise 🌿
        'input-text': '#1a1f1d',
        'input-placeholder': '#94a3a3', // muted gray-green → modern UX
        
        // Menu and page colors - Ngjyrat e Menusë & Faqes
        'menu-primary': '#349490', // turquoise green 🌿
        'menu-secondary': '#27736f', // më e errët për contrast & depth
        'menu-gradient-start': '#349490', // fresh turquoise
        'menu-gradient-end': '#1e5a57', // deep teal, super modern
        'menu-text': '#ffffff', // contrast perfekt
        'menu-hover': 'rgba(255, 255, 255, 0.1)',
        'menu-active': 'rgba(255, 255, 255, 0.2)',
        'page-header-bg': 'rgba(255, 255, 255, 0.85)', // semi-transparent → elegant
        'page-header-border': 'rgba(52, 148, 144, 0.35)', // turquoise border → premium
      }
    },
    // Green dark theme preset
    'green-dark': {
      name: 'Green Dark',
      colors: {
        // Background colors
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-tertiary': '#334155',
        'bg-card': '#1e293b',
        'bg-overlay': 'rgba(0, 0, 0, 0.7)',
        
        // Text colors
        'text-primary': '#f8fafc',
        'text-secondary': '#cbd5e1',
        'text-tertiary': '#94a3b8',
        'text-inverse': '#0f172a',
        
        // Border colors
        'border-primary': '#334155',
        'border-secondary': '#475569',
        'border-focus': '#22c55e',
        
        // Shadow colors
        'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
        'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
        'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
        
        // Status colors
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#22c55e',
        
        // Interactive colors
        'hover': 'rgba(34, 197, 94, 0.1)',
        'active': 'rgba(34, 197, 94, 0.2)',
        'focus': 'rgba(34, 197, 94, 0.3)',
        
        // Menu and page colors - Beautiful green dark theme
        'menu-primary': '#15803d',
        'menu-secondary': '#166534',
        'menu-gradient-start': '#15803d',
        'menu-gradient-end': '#166534',
        'menu-text': '#f8fafc',
        'menu-hover': 'rgba(255, 255, 255, 0.1)',
        'menu-active': 'rgba(255, 255, 255, 0.2)',
        'page-header-bg': 'rgba(15, 23, 42, 0.8)',
        'page-header-border': 'rgba(34, 197, 94, 0.2)',
      }
    },
    // Test1 Theme - Custom Green Theme
    'test1': {
      name: 'Test1 - Custom Green',
      colors: {
        // Background colors
        'bg-primary': '#fdfdfc',
        'bg-secondary': '#f6f9f8',
        'bg-tertiary': '#f1f5f9',
        'bg-card': '#ffffff',
        'bg-overlay': 'rgba(0, 0, 0, 0.5)',
        
        // Text colors
        'text-primary': '#1a1f1d',
        'text-secondary': '#2e423f',
        'text-tertiary': '#6b7f7b',
        'text-inverse': '#ffffff',
        
        // Border colors
        'border-primary': '#e2e8f0',
        'border-secondary': '#cbd5e1',
        'border-focus': '#3b82f6',
        
        // Status colors
        'success': '#16a34a',
        'warning': '#eab308',
        'error': '#dc2626',
        'info': '#0ea5e9',
        
        // Menu and page colors
        'menu-primary': '#349490',
        'menu-secondary': '#27736f',
        'menu-gradient-start': '#349490',
        'menu-gradient-end': '#1e5a57',
        'menu-text': '#ffffff',
        'menu-hover': 'rgba(255, 255, 255, 0.1)',
        'menu-active': 'rgba(255, 255, 255, 0.2)',
        'page-header-bg': 'rgba(255, 255, 255, 0.85)',
        'page-header-border': 'rgba(52, 148, 144, 0.35)',
        
        // Button colors
        'button-primary': '#349490',
        'button-primary-hover': '#2e7c78',
        'button-primary-active': '#25635f',
        'button-secondary': '#6b7280',
        'button-secondary-hover': '#4b5563',
        'button-secondary-active': '#374151',
        'button-success': '#16a34a',
        'button-success-hover': '#16a34a',
        'button-success-active': '#15803d',
        'button-danger': '#dc2626',
        'button-danger-hover': '#dc2626',
        'button-danger-active': '#b91c1c',
      }
    }
  }), []);

  // Apply theme to document
  const applyTheme = useCallback((themeName) => {
    let themeConfig;
    
    // Check if it's a custom theme
    if (themeName.startsWith('custom-')) {
      const customThemeId = themeName.replace('custom-', '');
      const customThemes = JSON.parse(localStorage.getItem('customThemes') || '[]');
      const customTheme = customThemes.find(t => t.id === customThemeId);
      
      if (customTheme) {
        themeConfig = customTheme;
        // Store the custom theme as active
        localStorage.setItem('activeCustomTheme', JSON.stringify(customTheme));
      } else {
        // Fallback to test1 theme if custom theme not found
        themeConfig = themes['test1'];
        localStorage.removeItem('activeCustomTheme');
      }
    } else {
      themeConfig = themes[themeName];
      if (themeName !== 'auto') {
        localStorage.removeItem('activeCustomTheme');
      }
    }
    
    if (!themeConfig) {
      // Fallback to test1 theme if theme not found
      themeConfig = themes['test1'];
    }

    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(themeConfig.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Apply theme class to body
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${themeName}`);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeConfig.colors['bg-primary']);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = themeConfig.colors['bg-primary'];
      document.head.appendChild(meta);
    }
  }, [themes]);

  // Load custom themes from API
  const loadCustomThemes = useCallback(async () => {
    try {
      const response = await api.get('/api/themes');
      if (response.data.success) {
        setCustomThemes(response.data.data);
      }
    } catch (error) {
      console.error('Error loading custom themes:', error);
    }
  }, []);

  // Load active theme from API (opt-in only)
  const loadActiveTheme = useCallback(async () => {
    const shouldUseDbTheme = localStorage.getItem('useDbTheme') === 'true';
    if (!shouldUseDbTheme) {
      // Keep current theme from code/localStorage; do not override from DB
      applyTheme(theme);
      return;
    }
    try {
      const response = await api.get('/api/themes/active/current');
      if (response.data.success) {
        const activeTheme = response.data.data;
        setActiveThemeData(activeTheme);
        
        if (activeTheme.type === 'custom') {
          // Load custom theme data
          const themeResponse = await api.get(`/api/themes/${activeTheme.id}`);
          if (themeResponse.data.success) {
            const customTheme = themeResponse.data.data;
            const root = document.documentElement;
            Object.entries(customTheme.colors).forEach(([key, value]) => {
              root.style.setProperty(`--theme-${key}`, value);
            });
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(`theme-custom-${customTheme.id}`);
            return;
          }
        } else if (activeTheme.type === 'preset') {
          // Apply preset theme immediately
          setTheme(activeTheme.id);
          return;
        }
      }
    } catch (error) {
      console.error('Error loading active theme:', error);
    }
    
    // Fallback to regular theme
    applyTheme(theme);
  }, [theme, applyTheme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      // Apply theme immediately from localStorage to prevent flash
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme);
        applyTheme(savedTheme);
      } else {
        // Apply default test1 theme immediately
        setTheme('test1');
        applyTheme('test1');
      }
      
      // Load custom themes and active theme in background
      try {
        await loadCustomThemes();
        // Only load active theme from DB if user opted-in via localStorage
        await loadActiveTheme();
      } catch (error) {
        console.warn('Could not load themes from API, using defaults:', error);
      }
      
      setIsInitialized(true);
    };
    
    initializeTheme();
  }, [loadCustomThemes, loadActiveTheme, setTheme, applyTheme]);

  // Apply theme when it changes
  useEffect(() => {
    if (theme) {
      applyTheme(theme);
    }
  }, [theme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Theme switching functions
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme]);

  const setThemeMode = useCallback((themeName) => {
    if (themes[themeName]) {
      setTheme(themeName);
    }
  }, [themes]);

  // Save custom theme
  const saveCustomTheme = useCallback(async (themeData) => {
    try {
      const response = await api.post('/api/themes', themeData);
      if (response.data.success) {
        await loadCustomThemes(); // Reload themes
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to save theme');
    } catch (error) {
      console.error('Error saving custom theme:', error);
      throw error;
    }
  }, [loadCustomThemes]);

  // Update custom theme
  const updateCustomTheme = useCallback(async (themeId, themeData) => {
    try {
      const response = await api.put(`/api/themes/${themeId}`, themeData);
      if (response.data.success) {
        await loadCustomThemes(); // Reload themes
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update theme');
    } catch (error) {
      console.error('Error updating custom theme:', error);
      throw error;
    }
  }, [loadCustomThemes]);

  // Delete custom theme
  const deleteCustomTheme = useCallback(async (themeId) => {
    try {
      const response = await api.delete(`/api/themes/${themeId}`);
      if (response.data.success) {
        await loadCustomThemes(); // Reload themes
        return true;
      }
      throw new Error(response.data.message || 'Failed to delete theme');
    } catch (error) {
      console.error('Error deleting custom theme:', error);
      throw error;
    }
  }, [loadCustomThemes]);

  // Set active theme
  const setActiveTheme = useCallback(async (themeType, themeId) => {
    try {
      const response = await api.post('/api/themes/active', {
        themeType,
        themeId
      });
      if (response.data.success) {
        setActiveThemeData({ type: themeType, id: themeId });
        return true;
      }
      throw new Error(response.data.message || 'Failed to set active theme');
    } catch (error) {
      console.error('Error setting active theme:', error);
      throw error;
    }
  }, []);

  // Get current theme configuration
  const currentTheme = themes[theme];
  const isDark = theme === 'dark';
  const isLight = theme === 'light';

  // Context value
  const value = useMemo(() => ({
    theme,
    setTheme: setThemeMode,
    toggleTheme,
    currentTheme,
    isDark,
    isLight,
    isInitialized,
    themes: Object.keys(themes),
    getThemeColor: (colorKey) => currentTheme?.colors[colorKey] || '',
    customThemes,
    activeThemeData,
    saveCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    setActiveTheme,
    loadCustomThemes,
  }), [theme, setThemeMode, toggleTheme, currentTheme, isDark, isLight, isInitialized, themes, customThemes, activeThemeData, saveCustomTheme, updateCustomTheme, deleteCustomTheme, setActiveTheme, loadCustomThemes]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

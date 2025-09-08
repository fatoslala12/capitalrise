import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

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
    // Get theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  const [isInitialized, setIsInitialized] = useState(false);

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
    // Green theme preset
    green: {
      name: 'Green',
      colors: {
        // Background colors
        'bg-primary': '#ffffff',
        'bg-secondary': '#f0fdf4',
        'bg-tertiary': '#dcfce7',
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
        'border-focus': '#22c55e',
        
        // Shadow colors
        'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        
        // Status colors
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#22c55e',
        
        // Interactive colors
        'hover': 'rgba(34, 197, 94, 0.1)',
        'active': 'rgba(34, 197, 94, 0.2)',
        'focus': 'rgba(34, 197, 94, 0.3)',
        
        // Menu and page colors - Beautiful green theme
        'menu-primary': '#16a34a',
        'menu-secondary': '#15803d',
        'menu-gradient-start': '#16a34a',
        'menu-gradient-end': '#15803d',
        'menu-text': '#ffffff',
        'menu-hover': 'rgba(255, 255, 255, 0.1)',
        'menu-active': 'rgba(255, 255, 255, 0.2)',
        'page-header-bg': 'rgba(255, 255, 255, 0.8)',
        'page-header-border': 'rgba(34, 197, 94, 0.2)',
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
    }
  }), []);

  // Apply theme to document
  const applyTheme = useCallback((themeName) => {
    const themeConfig = themes[themeName];
    if (!themeConfig) return;

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

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
    setIsInitialized(true);
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
  }), [theme, setThemeMode, toggleTheme, currentTheme, isDark, isLight, isInitialized, themes]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const ThemeToggle = ({ 
  variant = 'default', // 'default', 'minimal', 'icon-only'
  size = 'md', // 'sm', 'md', 'lg'
  showLabel = true,
  className = ''
}) => {
  const { theme, toggleTheme, isDark, isLight } = useTheme();
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const variants = {
    default: 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md hover:shadow-lg',
    minimal: 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800',
    'icon-only': 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800'
  };

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        ${variants[variant]}
        ${className}
        flex items-center justify-center
        rounded-lg transition-all duration-200
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-slate-800
        group
      `}
      title={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
      aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
    >
      {/* Sun Icon (Light Mode) */}
      <svg
        className={`
          ${iconSize[size]}
          transition-all duration-300
          ${isLight ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'}
          absolute
        `}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="5" strokeWidth="2"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2"/>
      </svg>

      {/* Moon Icon (Dark Mode) */}
      <svg
        className={`
          ${iconSize[size]}
          transition-all duration-300
          ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}
          absolute
        `}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeWidth="2"/>
      </svg>

      {/* Label */}
      {showLabel && variant !== 'icon-only' && (
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
          {isDark ? t('Light') : t('Dark')}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;

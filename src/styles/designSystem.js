// Design System - Unified colors, spacing, and styles
export const colors = {
  // Primary palette
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE', 
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main primary
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A'
  },
  
  // Secondary palette (Purple)
  secondary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE', 
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6', // Main secondary
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95'
  },
  
  // Status colors
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857'
  },
  
  warning: {
    50: '#FFFBEB', 
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309'
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2', 
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C'
  },
  
  // Neutral grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  }
};

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px  
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
  '4xl': '6rem',    // 96px
  '5xl': '8rem'     // 128px
};

export const borderRadius = {
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px'
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)'
};

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace']
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }]
  }
};

// Component style generators
export const getButtonStyles = (variant = 'primary', size = 'md') => {
  const baseStyles = `
    inline-flex items-center justify-center font-semibold rounded-lg 
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base', 
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };
  
  const variantStyles = {
    primary: `bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md hover:shadow-lg`,
    secondary: `bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 shadow-md hover:shadow-lg`,
    success: `bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-md hover:shadow-lg`,
    warning: `bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 shadow-md hover:shadow-lg`,
    danger: `bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg`,
    outline: `border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500`,
    ghost: `text-blue-600 hover:bg-blue-50 focus:ring-blue-500`
  };
  
  return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`;
};

export const getCardStyles = (variant = 'default') => {
  const baseStyles = `bg-white rounded-xl shadow-lg border transition-all duration-200`;
  
  const variantStyles = {
    default: 'border-gray-200 hover:shadow-xl',
    primary: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white',
    secondary: 'border-purple-200 bg-gradient-to-br from-purple-50 to-white',
    success: 'border-green-200 bg-gradient-to-br from-green-50 to-white',
    warning: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
    danger: 'border-red-200 bg-gradient-to-br from-red-50 to-white'
  };
  
  return `${baseStyles} ${variantStyles[variant]}`;
};

export const getInputStyles = (variant = 'default') => {
  const baseStyles = `
    block w-full px-3 py-2 border rounded-lg text-base
    transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-offset-1
  `;
  
  const variantStyles = {
    default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50',
    success: 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
  };
  
  return `${baseStyles} ${variantStyles[variant]}`;
};
import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'primary', 
  text = '', 
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
    '2xl': 'h-24 w-24',
    '3xl': 'h-32 w-32'
  };

  const variantClasses = {
    primary: 'from-blue-500 to-purple-600',
    secondary: 'from-gray-500 to-gray-700',
    success: 'from-green-500 to-emerald-600',
    warning: 'from-yellow-500 to-orange-600',
    danger: 'from-red-500 to-pink-600',
    white: 'from-white to-gray-200'
  };

  const spinner = (
    <div className={`relative ${className}`}>
      {/* Outer rotating ring */}
      <div className={`${sizeClasses[size]} border-4 border-transparent rounded-full animate-spin`} 
           style={{
             background: `conic-gradient(from 0deg, transparent, ${variant === 'primary' ? '#3b82f6' : variant === 'success' ? '#10b981' : variant === 'warning' ? '#f59e0b' : variant === 'danger' ? '#ef4444' : '#6b7280'}, transparent)`
           }}>
      </div>
      
      {/* Inner pulsing ring */}
      <div className={`absolute inset-2 border-2 border-transparent rounded-full animate-pulse`}
           style={{
             background: `conic-gradient(from 180deg, transparent, ${variant === 'primary' ? '#8b5cf6' : variant === 'success' ? '#34d399' : variant === 'warning' ? '#fbbf24' : variant === 'danger' ? '#f87171' : '#9ca3af'}, transparent)`
           }}>
      </div>
      
      {/* Center dot with breathing effect */}
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r ${variantClasses[variant]} animate-pulse`}></div>
      
      {/* Glowing aura effect */}
      <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gradient-to-r ${variantClasses[variant]} opacity-10 animate-ping`}></div>
      
      {/* Sparkle effects */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute bottom-0 right-0 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center z-50 overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-30" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-purple-400 rounded-full animate-ping opacity-20" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/6 w-1 h-1 bg-indigo-400 rounded-full animate-ping opacity-40" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-blue-300 rounded-full animate-ping opacity-25" style={{ animationDelay: '0.5s' }}></div>
        </div>
        
        <div className="text-center relative z-10">
          {/* Enhanced spinner with larger size for fullscreen */}
          <div className="mb-8">
            <div className="relative">
              {/* Outer rotating ring */}
              <div className="h-32 w-32 border-4 border-transparent rounded-full animate-spin mx-auto" 
                   style={{
                     background: `conic-gradient(from 0deg, transparent, #3b82f6, #8b5cf6, #3b82f6, transparent)`
                   }}>
              </div>
              
              {/* Inner pulsing ring */}
              <div className="absolute inset-4 border-2 border-transparent rounded-full animate-pulse mx-auto"
                   style={{
                     background: `conic-gradient(from 180deg, transparent, #8b5cf6, #a855f7, #8b5cf6, transparent)`
                   }}>
              </div>
              
              {/* Center dot with breathing effect */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"></div>
              
              {/* Glowing aura effect */}
              <div className="absolute inset-0 h-32 w-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-10 animate-ping mx-auto"></div>
              
              {/* Enhanced sparkle effects */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-2 right-2 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 right-2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
              <div className="absolute top-1/2 left-2 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
            </div>
          </div>
          
          {text && (
            <div className="animate-pulse">
              <p className="text-gray-700 font-semibold text-xl mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {text}
              </p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {spinner}
      {text && (
        <div className="mt-3 animate-pulse">
          <p className="text-gray-600 font-medium text-sm">{text}</p>
        </div>
      )}
    </div>
  );
};

// Specialized loading spinners
export const PageLoader = ({ text = "Loading page..." }) => (
  <LoadingSpinner 
    size="3xl" 
    variant="primary" 
    text={text} 
    fullScreen={true} 
  />
);

export const ContentLoader = ({ text = "Loading content..." }) => (
  <LoadingSpinner 
    size="xl" 
    variant="primary" 
    text={text} 
  />
);

export const ButtonLoader = ({ size = "sm" }) => (
  <LoadingSpinner 
    size={size} 
    variant="white" 
    className="inline-block" 
  />
);

export const TableLoader = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
        <div className="skeleton skeleton-avatar"></div>
        <div className="flex-1 space-y-2">
          <div className="skeleton skeleton-text w-3/4"></div>
          <div className="skeleton skeleton-text w-1/2"></div>
        </div>
        <div className="skeleton skeleton-text w-20"></div>
      </div>
    ))}
  </div>
);

export const CardLoader = ({ cards = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: cards }).map((_, index) => (
      <div key={index} className="bg-white rounded-xl shadow-sm p-6">
        <div className="skeleton skeleton-text w-1/2 mb-4"></div>
        <div className="skeleton skeleton-text w-full mb-2"></div>
        <div className="skeleton skeleton-text w-3/4 mb-2"></div>
        <div className="skeleton skeleton-text w-1/2"></div>
      </div>
    ))}
  </div>
);

export default LoadingSpinner;
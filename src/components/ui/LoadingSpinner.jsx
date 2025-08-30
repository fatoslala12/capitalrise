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
    primary: 'border-blue-600',
    secondary: 'border-gray-600',
    success: 'border-green-600',
    warning: 'border-yellow-600',
    danger: 'border-red-600',
    white: 'border-white'
  };

  const spinner = (
    <div className={`relative ${className}`}>
      {/* Main spinning ring */}
      <div className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-spin`}>
        <div className={`absolute inset-0 border-4 border-transparent border-t-current rounded-full ${variantClasses[variant]}`}></div>
      </div>
      
      {/* Pulsing background ring */}
      <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-pulse`}></div>
      
      {/* Glowing effect */}
      <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-20 animate-pulse`}></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center z-50">
        <div className="text-center">
          {spinner}
          {text && (
            <div className="mt-4 animate-pulse">
              <p className="text-gray-600 font-medium text-lg">{text}</p>
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
export default function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary',
  text = 'Duke ngarkuar...',
  fullScreen = false,
  className = ''
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };
  
  const colorClasses = {
    primary: 'border-blue-600',
    secondary: 'border-purple-600',
    white: 'border-white',
    gray: 'border-gray-600'
  };
  
  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div 
        className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[variant]} ${className}`}
      ></div>
      {text && (
        <p className="mt-4 text-lg font-medium text-gray-700">
          {text}
        </p>
      )}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {spinner}
      </div>
    );
  }
  
  return spinner;
}

// Skeleton loader for better perceived performance
export function SkeletonLoader({ lines = 3, className = '' }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

// Loading overlay for forms/modals
export function LoadingOverlay({ isLoading, children, text = 'Duke ngarkuar...' }) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  );
}
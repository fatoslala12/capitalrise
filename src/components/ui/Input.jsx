import { getInputStyles } from '../../styles/designSystem';

export default function Input({ 
  label = '',
  error = '',
  helper = '',
  variant = 'default',
  icon = null,
  className = '',
  required = false,
  ...props 
}) {
  const inputClass = getInputStyles(error ? 'error' : variant);
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
        
        <input
          className={`${inputClass} ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center mt-1">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-gray-500 mt-1">
          {helper}
        </p>
      )}
    </div>
  );
}

// Textarea component
export function Textarea({ 
  label = '',
  error = '',
  helper = '',
  className = '',
  required = false,
  rows = 4,
  ...props 
}) {
  const inputClass = getInputStyles(error ? 'error' : 'default');
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        rows={rows}
        className={`${inputClass} ${className}`}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-600 flex items-center mt-1">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-gray-500 mt-1">
          {helper}
        </p>
      )}
    </div>
  );
}

// Select component
export function Select({ 
  label = '',
  error = '',
  helper = '',
  options = [],
  className = '',
  required = false,
  ...props 
}) {
  const inputClass = getInputStyles(error ? 'error' : 'default');
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        className={`${inputClass} ${className}`}
        {...props}
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center mt-1">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-gray-500 mt-1">
          {helper}
        </p>
      )}
    </div>
  );
}
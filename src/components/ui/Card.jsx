import { getCardStyles } from '../../styles/designSystem';

export default function Card({ 
  children, 
  variant = 'default',
  padding = 'lg',
  className = '',
  ...props 
}) {
  const cardClass = getCardStyles(variant);
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8',
    xl: 'p-12'
  };
  
  return (
    <div 
      className={`${cardClass} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Header component
export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-6 pb-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

// Card Title component
export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-2xl font-bold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

// Card Content component
export function CardContent({ children, className = '' }) {
  return (
    <div className={`${className}`}>
      {children}
    </div>
  );
}

// Card Footer component
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-6 pt-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
}
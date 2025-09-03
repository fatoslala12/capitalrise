export default function Badge({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '',
  ...props 
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    primary: 'bg-blue-100 text-blue-800 border-blue-200',
    secondary: 'bg-purple-100 text-purple-800 border-purple-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-sky-100 text-sky-800 border-sky-200'
  };
  
  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${sizeClasses[size]} 
        ${variantClasses[variant]} 
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}

// Specialized status badges
export function StatusBadge({ status, ...props }) {
  // Function to translate contract status
  const translateStatus = (status) => {
    const userLanguage = localStorage.getItem('language') || 'en';
    
    if (userLanguage === 'sq') {
      return status; // Return Albanian status as is
    }
    
    // Translate to English
    const statusMap = {
      'Ne progres': 'In Progress',
      'Draft': 'Draft',
      'Anulluar': 'Cancelled',
      'Pezulluar': 'Suspended',
      'Mbyllur': 'Closed',
      'Mbyllur me vonese': 'Closed with Delay'
    };
    
    return statusMap[status] || status;
  };

  const statusConfig = {
    // New translation keys
    'draft': { variant: 'default', icon: '📝' },
    'cancelled': { variant: 'danger', icon: '❌' },
    'inProgress': { variant: 'primary', icon: '🔄' },
    'suspended': { variant: 'warning', icon: '⏸️' },
    'closed': { variant: 'success', icon: '✅' },
    'closedWithDelay': { variant: 'danger', icon: '⚠️' },
    // Legacy support for backward compatibility
    'Draft': { variant: 'default', icon: '📝' },
    'Anulluar': { variant: 'danger', icon: '❌' },
    'Ne progres': { variant: 'primary', icon: '🔄' },
    'Pezulluar': { variant: 'warning', icon: '⏸️' },
    'Mbyllur': { variant: 'success', icon: '✅' },
    'Mbyllur me vonese': { variant: 'danger', icon: '⚠️' },
    'Mbyllur me vonesë': { variant: 'danger', icon: '⚠️' },
    'Aktive': { variant: 'success', icon: '✅' },
    'Active': { variant: 'success', icon: '✅' },
    'Closed': { variant: 'info', icon: '✔️' },
    'Closed Late': { variant: 'danger', icon: '⚠️' },
    'ongoing': { variant: 'warning', icon: '🔄' },
    'completed': { variant: 'success', icon: '✅' },
    'pending': { variant: 'warning', icon: '⏳' },
    'overdue': { variant: 'danger', icon: '🚨' }
  };
  
  const config = statusConfig[status] || { variant: 'default', icon: '❓' };
  
  return (
    <Badge variant={config.variant} {...props}>
      <span className="mr-1">{config.icon}</span>
      {translateStatus(status)}
    </Badge>
  );
}

export function PaymentBadge({ isPaid, ...props }) {
  return (
    <Badge 
      variant={isPaid ? 'success' : 'warning'} 
      {...props}
    >
      <span className="mr-1">{isPaid ? '✅' : '⏳'}</span>
      {isPaid ? 'E paguar' : 'E papaguar'}
    </Badge>
  );
}

export function PriorityBadge({ priority, ...props }) {
  const priorityConfig = {
    'high': { variant: 'danger', icon: '🔴' },
    'medium': { variant: 'warning', icon: '🟡' },
    'low': { variant: 'success', icon: '🟢' }
  };
  
  const config = priorityConfig[priority] || { variant: 'default', icon: '⚪' };
  
  return (
    <Badge variant={config.variant} {...props}>
      <span className="mr-1">{config.icon}</span>
      {priority}
    </Badge>
  );
}
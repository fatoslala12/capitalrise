// Layout components for responsive design

export function Container({ children, size = 'full', className = '' }) {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl', 
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  };
  
  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  );
}

export function Grid({ 
  children, 
  cols = { xs: 1, sm: 2, md: 3, lg: 4 }, 
  gap = 'md',
  className = '' 
}) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };
  
  const colClasses = `
    grid 
    grid-cols-${cols.xs} 
    sm:grid-cols-${cols.sm || cols.xs} 
    md:grid-cols-${cols.md || cols.sm || cols.xs}
    lg:grid-cols-${cols.lg || cols.md || cols.sm || cols.xs}
  `;
  
  return (
    <div className={`${colClasses} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

export function Flex({ 
  children, 
  direction = 'row', 
  align = 'start', 
  justify = 'start',
  wrap = false,
  gap = 'md',
  className = '' 
}) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse'
  };
  
  const alignClasses = {
    start: 'items-start',
    center: 'items-center', 
    end: 'items-end',
    stretch: 'items-stretch'
  };
  
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  };
  
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4', 
    lg: 'gap-6',
    xl: 'gap-8'
  };
  
  return (
    <div className={`
      flex 
      ${directionClasses[direction]} 
      ${alignClasses[align]} 
      ${justifyClasses[justify]}
      ${wrap ? 'flex-wrap' : ''}
      ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
}

export function Stack({ children, space = 'md', className = '' }) {
  const spaceClasses = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6', 
    xl: 'space-y-8'
  };
  
  return (
    <div className={`${spaceClasses[space]} ${className}`}>
      {children}
    </div>
  );
}

// Responsive table wrapper
export function ResponsiveTable({ children, className = '' }) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className={`min-w-full divide-y divide-gray-300 ${className}`}>
            {children}
          </table>
        </div>
      </div>
    </div>
  );
}

// Mobile-friendly sidebar
export function MobileSidebar({ isOpen, onClose, children }) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {children}
      </div>
    </>
  );
}
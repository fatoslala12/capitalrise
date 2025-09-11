import Card from './Card';

export default function StatCard({
  title,
  value,
  subtitle = null,
  icon = null,
  trend = null,
  color = 'blue',
  className = ''
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-[#32938b]/10 to-[#32938b]/20',
      border: 'border-[#32938b]/20',
      icon: 'text-[#32938b] bg-[#32938b]/10',
      value: 'text-[#32938b]',
      title: 'text-[#32938b]'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      border: 'border-green-200',
      icon: 'text-green-600 bg-green-100',
      value: 'text-green-900',
      title: 'text-green-700'
    },
    purple: {
      bg: 'bg-gradient-to-br from-[#2a6b66]/10 to-[#2a6b66]/20',
      border: 'border-[#2a6b66]/20',
      icon: 'text-[#2a6b66] bg-[#2a6b66]/10',
      value: 'text-[#2a6b66]',
      title: 'text-[#2a6b66]'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
      border: 'border-amber-200',
      icon: 'text-amber-600 bg-amber-100',
      value: 'text-amber-900',
      title: 'text-amber-700'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      border: 'border-red-200',
      icon: 'text-red-600 bg-red-100',
      value: 'text-red-900',
      title: 'text-red-700'
    }
  };
  
  const colors = colorClasses[color] || colorClasses.blue;
  
  return (
    <Card 
      padding="lg" 
      className={`${colors.bg} ${colors.border} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${colors.title} mb-2`}>
            {title}
          </h3>
          <div className={`text-3xl font-bold ${colors.value} mb-1`}>
            {value}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.positive ? '↗️' : '↘️'} {trend.value}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {trend.period}
              </span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className={`w-12 h-12 rounded-lg ${colors.icon} flex items-center justify-center text-2xl ml-4`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// Specialized stat cards
export function MoneyStatCard({ title, amount, currency = '£', color = 'green', ...props }) {
  const formattedAmount = typeof amount === 'number' 
    ? `${currency}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : `${currency}0.00`;
    
  return (
    <StatCard
      title={title}
      value={formattedAmount}
      color={color}
      icon="💰"
      {...props}
    />
  );
}

export function CountStatCard({ title, count, icon, color = 'blue', ...props }) {
  return (
    <StatCard
      title={title}
      value={count || 0}
      color={color}
      icon={icon}
      {...props}
    />
  );
}

export function PercentageStatCard({ title, percentage, color = 'purple', ...props }) {
  return (
    <StatCard
      title={title}
      value={`${percentage || 0}%`}
      color={color}
      icon="📊"
      {...props}
    />
  );
}
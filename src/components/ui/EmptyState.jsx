import Button from './Button';

export default function EmptyState({
  icon = '📭',
  title = 'Nuk ka të dhëna',
  description = 'Nuk ka ende asgjë për të shfaqur',
  actionLabel = null,
  onAction = null,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <span className="text-4xl">{icon}</span>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-500 mb-6 max-w-sm">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Specialized empty states
export function NoContractsEmpty({ onAdd }) {
  return (
    <EmptyState
      icon="📄"
      title="Nuk ka kontrata"
      description="Nuk ka kontrata të regjistruara ende. Krijoni kontratën e parë për të filluar."
      actionLabel="Krijo Kontratë të Re"
      onAction={onAdd}
    />
  );
}

export function NoEmployeesEmpty({ onAdd }) {
  return (
    <EmptyState
      icon="👷"
      title="Nuk ka punonjës"
      description="Nuk ka punonjës të regjistruar ende. Shtoni punonjës për të filluar."
      actionLabel="Shto Punonjës të Ri"
      onAction={onAdd}
    />
  );
}

export function NoTasksEmpty({ onAdd }) {
  return (
    <EmptyState
      icon="📝"
      title="Nuk ka detyra"
      description="Nuk ka detyra të caktuara ende. Krijoni detyrën e parë."
      actionLabel="Krijo Detyrë të Re"
      onAction={onAdd}
    />
  );
}

export function NoExpensesEmpty({ onAdd }) {
  return (
    <EmptyState
      icon="🧾"
      title="Nuk ka shpenzime"
      description="Nuk ka shpenzime të regjistruara për këtë kontratë."
      actionLabel="Shto Shpenzim"
      onAction={onAdd}
    />
  );
}

export function NoDataFound() {
  return (
    <EmptyState
      icon="🔍"
      title="Nuk u gjetën rezultate"
      description="Provoni të ndryshoni filtrat ose kriteret e kërkimit."
    />
  );
}
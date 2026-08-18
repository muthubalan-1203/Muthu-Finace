export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-cream-300 dark:bg-ink-600 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-ink-200 dark:text-ink-300" />
        </div>
      )}
      <h3 className="font-display font-semibold text-ink dark:text-cream-50 mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-300 dark:text-ink-200 mb-4 text-center max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

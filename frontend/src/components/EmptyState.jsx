export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-strong bg-surface-subtle px-6 py-14 text-center">

      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle text-accent">
          <Icon size={19} strokeWidth={1.75} />
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-primary">
          {title}
        </p>

        {description && (
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}
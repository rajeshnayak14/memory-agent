export default function TextField({
  label,
  id,
  error,
  hint,
  className = "",
  textarea = false,
  ...props
}) {
  const Component = textarea ? "textarea" : "input";

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <Component
        id={id}
        className={`w-full rounded border bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 ${
          error
            ? "border-danger-500/60 focus:border-danger-500"
            : "border-border-strong focus:border-ink-700"
        }`}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-300">{hint}</p>
      ) : null}
    </div>
  );
}

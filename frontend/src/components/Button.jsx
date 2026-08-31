import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-primary text-surface border border-primary hover:bg-primary-hover hover:border-primary-hover",

  accent:
    "bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover",

  secondary:
    "bg-surface text-primary border border-border-strong hover:border-border-strong hover:bg-surface-hover",

  danger:
    "bg-transparent text-danger border border-danger-border hover:bg-danger-subtle",

  ghost:
    "bg-transparent text-secondary border border-transparent hover:bg-accent-subtle hover:text-primary",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  type = "button",
  className = "",
  ...props
}) {
  const sizeClasses =
    size === "sm"
      ? "px-3 py-1.5 text-sm"
      : "px-4 py-2.5 text-sm";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-tight transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2
          size={15}
          className="animate-spin"
          strokeWidth={2}
        />
      ) : (
        Icon && <Icon size={15} strokeWidth={2} />
      )}

      {children}
    </button>
  );
}
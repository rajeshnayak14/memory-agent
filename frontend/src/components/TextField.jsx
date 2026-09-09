import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function TextField({
  label,
  id,
  error,
  hint,
  className = "",
  textarea = false,
  type = "text",
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const Component = textarea ? "textarea" : "input";
  const isPassword = !textarea && type === "password";

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}

      <div className="relative">
        <Component
          id={id}
          type={isPassword ? (visible ? "text" : "password") : type}
          className={`w-full rounded-2xl border bg-surface px-4 py-2.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 ${
            isPassword ? "pr-10" : ""
          } ${
            error
              ? "border-danger-500/60 focus:border-danger-500"
              : "border-border-strong focus:border-ink-700"
          }`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-300 transition-colors hover:text-ink-700"
          >
            {visible ? (
              <EyeOff size={16} strokeWidth={1.8} />
            ) : (
              <Eye size={16} strokeWidth={1.8} />
            )}
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-danger-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-300">{hint}</p>
      ) : null}
    </div>
  );
}

import { Pause, Play, Trash2 } from "lucide-react";
import { formatDate } from "../utils/formatDate";
import { formatMoney } from "../utils/currency";

export default function RecurringRow({
  label,
  amount,
  currency,
  frequency,
  nextDate,
  active,
  onToggleActive,
  onDelete,
  busy,
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-semibold text-primary">
            {formatMoney(amount, currency)}
          </p>

          <span className="truncate text-sm text-secondary">{label}</span>

          {!active && (
            <span className="shrink-0 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] uppercase tracking-wide text-faint">
              paused
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs text-faint">
          {frequency} · next {formatDate(nextDate)}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onToggleActive}
          disabled={busy}
          aria-label={active ? "Pause" : "Resume"}
          title={active ? "Pause" : "Resume"}
          className="rounded-lg p-2 text-faint transition-colors hover:bg-accent-subtle hover:text-accent disabled:opacity-50"
        >
          {active ? (
            <Pause size={15} strokeWidth={1.9} />
          ) : (
            <Play size={15} strokeWidth={1.9} />
          )}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete recurring rule"
          className="rounded-lg p-2 text-faint transition-colors hover:bg-danger-subtle hover:text-danger disabled:opacity-50"
        >
          <Trash2 size={15} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}

import { Trash2 } from "lucide-react";
import { formatMoney } from "../utils/currency";

function formatPeriod(start, end) {
  const startDate = new Date(start);
  // period_end is exclusive — display the last included day.
  const endDate = new Date(new Date(end).getTime() - 86400000);
  const opts = { month: "short", day: "numeric", year: "numeric" };
  const startStr = startDate.toLocaleDateString(undefined, opts);
  const endStr = endDate.toLocaleDateString(undefined, opts);
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

export default function BudgetCard({ budget, onDelete, deleting }) {
  const pct = Math.min(budget.used_pct, 100);
  const barColor =
    budget.used_pct >= 100
      ? "bg-danger"
      : budget.used_pct >= 80
        ? "bg-warn"
        : "bg-success";

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold text-primary">
            {formatMoney(budget.amount, budget.currency)}
          </p>
          <p className="truncate text-xs text-faint">
            {formatPeriod(budget.period_start, budget.period_end)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDelete(budget)}
          disabled={deleting}
          aria-label="Delete budget"
          className="shrink-0 rounded-full p-1.5 text-faint transition-colors hover:bg-danger-subtle hover:text-danger disabled:opacity-50"
        >
          <Trash2 size={14} strokeWidth={1.9} />
        </button>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-subtle">
        <div
          className={`h-full rounded-full transition-[width] ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{formatMoney(budget.spent, budget.currency)} spent</span>
        <span>{budget.used_pct.toFixed(0)}% used</span>
      </div>

      <p className="mt-1 text-xs text-muted">
        {budget.remaining >= 0
          ? `${formatMoney(budget.remaining, budget.currency)} remaining`
          : `${formatMoney(Math.abs(budget.remaining), budget.currency)} over budget`}
      </p>
    </div>
  );
}

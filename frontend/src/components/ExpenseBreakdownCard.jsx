import { PieChart } from "lucide-react";
import { formatMoney } from "../utils/currency";

export default function ExpenseBreakdownCard({ card }) {
  const showCurrency = card.totals.length > 1;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.04)]">
      <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-2.5">
        <PieChart size={13} strokeWidth={1.8} className="text-accent" />
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Spending by category
        </span>
      </div>

      <div className="divide-y divide-border px-4">
        {card.items.map((item) => (
          <div
            key={`${item.category}-${item.currency}`}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span className="capitalize text-secondary">{item.category}</span>
            <span className="font-mono font-semibold text-primary">
              {formatMoney(item.amount, item.currency)}
              {showCurrency && (
                <span className="ml-1 text-xs font-normal text-faint">
                  {item.currency}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-2.5">
        <span className="text-sm font-medium text-primary">Total</span>

        <div className="text-right">
          {card.totals.map((total) => (
            <div
              key={total.currency}
              className="font-mono text-sm font-semibold text-primary"
            >
              {formatMoney(total.amount, total.currency)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

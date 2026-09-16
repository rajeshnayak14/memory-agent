import { PieChart } from "lucide-react";
import { formatMoney } from "../utils/currency";

export default function ExpenseBreakdownCard({ card }) {
  const showCurrency = card.totals.length > 1;

  return (
    <div className="mt-2 overflow-hidden rounded-3xl border border-border bg-surface shadow-soft dark:shadow-none">
      <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-2.5">
        <PieChart size={13} strokeWidth={1.8} className="text-accent" />
        <span className="text-xs text-muted">
          Spending by category
        </span>
      </div>

      {/* auto-fit/minmax rather than viewport-breakpoint column counts: this
          card can sit next to a sidebar and the chat side panel, so the
          space actually available to it is not the same as the viewport
          width a sm:/lg: breakpoint would assume. auto-fit measures the
          real rendered container and fits as many >=150px columns as
          actually fit, so it adapts correctly either way. */}
      <div className="grid max-h-96 grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 overflow-y-auto px-3 py-2 sm:px-4">
        {card.items.map((item) => (
          <div
            key={`${item.category}-${item.currency}`}
            className="flex min-w-0 items-center justify-between gap-3 rounded-lg px-1.5 py-2 text-sm hover:bg-surface-hover"
          >
            <span className="min-w-0 flex-1 truncate capitalize text-secondary">
              {item.category}
            </span>
            <span className="shrink-0 font-mono font-semibold text-primary">
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

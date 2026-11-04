import { CalendarDays } from "lucide-react";
import { formatMoney } from "../utils/currency";

function formatDayHeading(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dayTotal(items) {
  const byCurrency = {};
  for (const item of items) {
    byCurrency[item.currency] = (byCurrency[item.currency] || 0) + item.amount;
  }
  return Object.entries(byCurrency).map(([currency, amount]) => ({ currency, amount }));
}

export default function DailyBreakdownCard({ card }) {
  const showCurrency = card.totals.length > 1;

  return (
    <div className="mt-2 overflow-hidden rounded-3xl border border-border bg-surface shadow-soft dark:shadow-none">
      <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-2.5">
        <CalendarDays size={13} strokeWidth={1.8} className="text-accent" />
        <span className="text-xs text-muted">Spending by day</span>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-border">
        {card.days.map((day) => {
          const totals = dayTotal(day.items);
          return (
            <div key={day.date} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  {formatDayHeading(day.date)}
                </span>
                <div className="flex gap-1.5">
                  {totals.map((t) => (
                    <span key={t.currency} className="font-mono text-xs font-semibold text-accent">
                      {formatMoney(t.amount, t.currency)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                {day.items.map((item) => (
                  <div
                    key={`${item.category}-${item.currency}`}
                    className="flex min-w-0 items-center justify-between gap-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm capitalize text-secondary">
                      {item.category}
                    </span>
                    <span className="shrink-0 font-mono text-sm text-primary">
                      {formatMoney(item.amount, item.currency)}
                      {showCurrency && (
                        <span className="ml-1 text-xs text-faint">{item.currency}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-2.5">
        <span className="text-sm font-medium text-primary">Total</span>
        <div className="flex gap-3">
          {card.totals.map((total) => (
            <span key={total.currency} className="font-mono text-sm font-semibold text-primary">
              {formatMoney(total.amount, total.currency)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

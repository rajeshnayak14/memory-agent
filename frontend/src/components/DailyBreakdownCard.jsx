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

export default function DailyBreakdownCard({ card }) {
  const showCurrency = card.totals.length > 1;

  return (
    <div className="mt-2 overflow-hidden rounded-3xl border border-border bg-surface shadow-soft dark:shadow-none">
      <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-2.5">
        <CalendarDays size={13} strokeWidth={1.8} className="text-accent" />
        <span className="text-xs text-muted">
          Spending by day
        </span>
      </div>

      {/* CSS multi-column, sized by column-width rather than a fixed count:
          a fixed sm:/xl: column count reacts to VIEWPORT width, but this
          card can sit next to a sidebar and the chat side panel, so the
          space actually available to it is often much narrower than the
          viewport. columns-[Npx] instead measures the real rendered
          container and fits as many columns of that width as actually
          fit. Columns (vs. grid) also means days vary in how many line
          items they have without a grid's row-major flow stranding a
          short day next to a tall row-mate in empty space — a busy day
          just makes its own column longer. */}
      <div className="max-h-[28rem] columns-[15rem] gap-x-8 overflow-y-auto px-4 py-3">
        {card.days.map((day) => (
          <div
            key={day.date}
            className="mb-4 min-w-0 break-inside-avoid pb-1"
          >
            <p className="mb-1.5 text-xs text-muted">
              {formatDayHeading(day.date)}
            </p>

            <div className="space-y-1.5">
              {day.items.map((item) => (
                <div
                  key={`${item.category}-${item.currency}`}
                  className="flex min-w-0 items-center justify-between gap-3 text-sm"
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

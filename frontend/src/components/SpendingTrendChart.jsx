import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "../utils/currency";

// Trend-over-time is a sequential color job (magnitude over an ordered
// axis), not categorical — one hue, matching CategoryChart's convention.
const ACCENT = "rgb(var(--accent))";
const MUTED_TEXT = "rgb(var(--text-faint))";
const GRID = "rgb(var(--border-default))";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-[0_4px_16px_rgba(32,37,34,0.08)]">
      <p className="font-medium text-primary">{label}</p>
      <p className="mt-0.5 text-secondary">{item.formattedAmount}</p>
    </div>
  );
}

export default function SpendingTrendChart({ daily }) {
  if (!daily || daily.length === 0) return null;

  // Multiple currencies never get summed together — show whichever one
  // has the largest total (the common case is a single currency anyway),
  // and note the rest are excluded rather than silently mixing them.
  const totalsByCurrency = {};
  for (const entry of daily) {
    totalsByCurrency[entry.currency] =
      (totalsByCurrency[entry.currency] || 0) + entry.amount;
  }
  const currencies = Object.keys(totalsByCurrency);
  const dominantCurrency = currencies.sort(
    (a, b) => totalsByCurrency[b] - totalsByCurrency[a]
  )[0];

  const byDate = {};
  for (const entry of daily) {
    if (entry.currency !== dominantCurrency) continue;
    byDate[entry.date] = (byDate[entry.date] || 0) + entry.amount;
  }

  const data = Object.entries(byDate)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      amount,
      formattedAmount: formatMoney(amount, dominantCurrency),
    }));

  const height = 220;

  return (
    <div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: MUTED_TEXT }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: MUTED_TEXT }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: GRID }} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={ACCENT}
              strokeWidth={2}
              fill={ACCENT}
              fillOpacity={0.1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {currencies.length > 1 && (
        <p className="mt-2 text-xs text-faint">
          Showing {dominantCurrency} only — other currencies in this period
          aren&apos;t mixed into the same trend line.
        </p>
      )}
    </div>
  );
}

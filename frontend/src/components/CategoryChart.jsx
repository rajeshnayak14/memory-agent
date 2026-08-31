import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "../utils/currency";

// Categories (food, travel, rent, ...) are nominal — no natural order — so
// every bar gets the same single accent hue rather than a value ramp or a
// categorical palette. Magnitude is already carried by bar length; color
// isn't asked to double-encode it. See the dataviz skill's anti-patterns
// list ("a value-ramp on nominal categories").
// CSS custom properties, not static hex — SVG presentation attributes
// accept var() directly and repaint automatically on theme toggle. The
// tokens hold raw "R G B" channels (so Tailwind's opacity modifiers work
// elsewhere in the app), so they need wrapping in rgb(...) here too.
const ACCENT = "rgb(var(--accent))";
const MUTED_TEXT = "rgb(var(--text-faint))";
const GRID = "rgb(var(--border-default))";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-[0_4px_16px_rgba(32,37,34,0.08)]">
      <p className="font-medium text-primary">{item.label}</p>
      <p className="mt-0.5 text-secondary">{item.formattedAmount}</p>
    </div>
  );
}

export default function CategoryChart({ breakdown }) {
  if (!breakdown || breakdown.length === 0) return null;

  // Amounts in different currencies are never summed or compared as if
  // fungible — each bar keeps its own currency's label and symbol.
  const multiCurrency = new Set(breakdown.map((b) => b.currency)).size > 1;

  const data = [...breakdown]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map((b) => ({
      label: multiCurrency ? `${b.category} (${b.currency})` : b.category,
      amount: b.amount,
      formattedAmount: formatMoney(b.amount, b.currency),
    }));

  const height = Math.max(data.length * 36 + 40, 140);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 56, bottom: 4, left: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={false} stroke={GRID} />

          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: MUTED_TEXT }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fontSize: 12, fill: "rgb(var(--text-secondary))" }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgb(var(--bg-surface-hover))" }} />

          <Bar dataKey="amount" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList
              dataKey="formattedAmount"
              position="right"
              style={{ fill: "rgb(var(--text-secondary))", fontSize: 11, fontFamily: "monospace" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

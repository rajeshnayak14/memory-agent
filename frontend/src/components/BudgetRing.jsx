import { formatMoney } from "../utils/currency";

// A severity-colored circular METER (fill = spent/total, one ratio against
// a limit), not a 2-slice pie comparing "spent" and "remaining" as if they
// were independent categories — the dataviz skill flags that as an
// anti-pattern ("a pie of 2 slices" -> the recommended form is a meter).
// Visually close to a donut; semantically a single progress ring, using
// the same green/amber/red thresholds as BudgetCard's linear bar.
export default function BudgetRing({ budget }) {
  const size = 148;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const pct = budget.amount ? Math.min(budget.spent / budget.amount, 1) : 0;
  const offset = circumference * (1 - pct);

  const usedPct = budget.amount ? (budget.spent / budget.amount) * 100 : 0;
  const color =
    usedPct >= 100 ? "rgb(var(--danger))" : usedPct >= 80 ? "rgb(var(--warn))" : "rgb(var(--accent))";

  const remaining = budget.amount - budget.spent;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--border-default))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-primary"
          style={{ fontSize: 20, fontWeight: 600, fontFamily: "monospace" }}
        >
          {formatMoney(Math.abs(remaining), budget.currency)}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          className="fill-muted"
          style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {remaining >= 0 ? "Left" : "Over"}
        </text>
      </svg>

      <div className="mt-3 flex w-full flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Budget
          </span>
          <span className="font-mono text-primary">
            {formatMoney(budget.amount, budget.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-secondary">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            Spent
          </span>
          <span className="font-mono text-primary">
            {formatMoney(budget.spent, budget.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
            Left
          </span>
          <span className="font-mono text-primary">
            {formatMoney(remaining, budget.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

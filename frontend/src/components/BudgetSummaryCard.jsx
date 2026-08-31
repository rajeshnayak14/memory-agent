import { Calendar, ArrowDownCircle, TrendingUp } from "lucide-react";
import { formatMoney } from "../utils/currency";
import { formatDate } from "../utils/formatDate";

function formatPeriod(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(new Date(end).getTime() - 86400000);
  const opts = { month: "short", day: "numeric", year: "numeric" };
  const startStr = startDate.toLocaleDateString(undefined, opts);
  const endStr = endDate.toLocaleDateString(undefined, opts);
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

function Row({ icon: Icon, label, value, valueClass = "text-primary" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-sm text-secondary">
        <Icon size={14} strokeWidth={1.8} className="text-faint" />
        {label}
      </div>
      <span className={`font-mono text-sm font-semibold ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

export default function BudgetSummaryCard({ card }) {
  const remainingClass =
    card.remaining < 0
      ? "text-danger"
      : card.remaining / (card.amount || 1) < 0.2
        ? "text-warn"
        : "text-success";

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.04)]">
      <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-2.5">
        <Calendar size={13} strokeWidth={1.8} className="text-accent" />
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {formatPeriod(card.period_start, card.period_end)}
        </span>
      </div>

      <div className="divide-y divide-border px-4">
        <Row
          icon={Calendar}
          label="Total Budget"
          value={formatMoney(card.amount, card.currency)}
        />
        <Row
          icon={ArrowDownCircle}
          label="Total Spent"
          value={formatMoney(card.spent, card.currency)}
        />
        <Row
          icon={TrendingUp}
          label="Current Balance"
          value={formatMoney(card.remaining, card.currency)}
          valueClass={remainingClass}
        />
      </div>
    </div>
  );
}

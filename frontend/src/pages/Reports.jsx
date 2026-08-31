import { useCallback, useEffect, useState } from "react";
import { FileBarChart, AlertTriangle, TrendingUp, BarChart3, PiggyBank } from "lucide-react";

import { getExpenseBreakdown, getExpenseDailyBreakdown } from "../api/expenses";
import { listBudgets } from "../api/budgets";
import { getErrorMessage } from "../utils/errorMessage";
import { formatMoney } from "../utils/currency";

import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import CategoryChart from "../components/CategoryChart";
import SpendingTrendChart from "../components/SpendingTrendChart";

const PERIOD_OPTIONS = [
  { value: "this week", label: "This week" },
  { value: "this month", label: "This month" },
  { value: "last month", label: "Last month" },
  { value: "this year", label: "This year" },
];

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <Icon size={14} className="text-faint" strokeWidth={1.8} />
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {title}
      </span>
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState("this month");

  const [breakdown, setBreakdown] = useState([]);
  const [daily, setDaily] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(() => {
    return Promise.all([
      getExpenseBreakdown({ period }).then((data) => setBreakdown(data.breakdown)),
      getExpenseDailyBreakdown({ period }).then((data) => setDaily(data.daily)),
      listBudgets().then((data) => setBudgets(data.budgets)),
    ]);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load reports.")))
      .finally(() => setLoading(false));
  }, [refresh]);

  const totalsByCurrency = {};
  for (const entry of breakdown) {
    totalsByCurrency[entry.currency] =
      (totalsByCurrency[entry.currency] || 0) + entry.amount;
  }

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle text-accent">
            <FileBarChart size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              Spending analysis
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-primary">
              Reports
            </h1>
            <p className="mt-1 text-sm text-muted">
              Trends, category splits, and budget performance.
            </p>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.value
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border-strong bg-surface text-secondary hover:bg-surface-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-7 flex justify-center rounded-xl border border-border bg-surface py-16">
            <Spinner size={20} />
          </div>
        ) : loadError ? (
          <div className="mt-7">
            <EmptyState icon={AlertTriangle} title="Could not load reports" description={loadError} />
          </div>
        ) : (
          <div className="mt-7 flex flex-col gap-6">
            {Object.keys(totalsByCurrency).length > 0 && (
              <div className="flex flex-wrap gap-3">
                {Object.entries(totalsByCurrency).map(([currency, amount]) => (
                  <div key={currency} className="rounded-xl border border-border bg-surface px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                      Total ({currency})
                    </p>
                    <p className="mt-1 font-mono text-xl font-semibold text-primary">
                      {formatMoney(amount, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
              <SectionHeader icon={TrendingUp} title="Spending trend" />
              <div className="p-4">
                {daily.length === 0 ? (
                  <p className="py-8 text-center text-sm text-faint">
                    No expenses in this period.
                  </p>
                ) : (
                  <SpendingTrendChart daily={daily} />
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
              <SectionHeader icon={BarChart3} title="By category" />
              <div className="p-4">
                {breakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-faint">
                    No expenses in this period.
                  </p>
                ) : (
                  <CategoryChart breakdown={breakdown} />
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
              <SectionHeader icon={PiggyBank} title="Budget performance" />
              {budgets.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-faint">
                  No budgets set.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle">
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary">Period</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary">Budget</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary">Spent</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary">Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgets.map((budget) => (
                        <tr key={budget.id} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-2.5 text-secondary">
                            {new Date(budget.period_start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            {" – "}
                            {new Date(new Date(budget.period_end).getTime() - 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </td>
                          <td className="px-4 py-2.5 text-right text-primary">
                            {formatMoney(budget.amount, budget.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-primary">
                            {formatMoney(budget.spent, budget.currency)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-medium ${
                              budget.used_pct >= 100
                                ? "text-danger"
                                : budget.used_pct >= 80
                                  ? "text-warn"
                                  : "text-success"
                            }`}
                          >
                            {budget.used_pct.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

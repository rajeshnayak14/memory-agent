import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Receipt, BarChart3 } from "lucide-react";

import { listExpenses, getExpenseBreakdown } from "../api/expenses";
import { listBudgets } from "../api/budgets";
import { formatMoney } from "../utils/currency";
import { formatDate } from "../utils/formatDate";

import BudgetRing from "./BudgetRing";

const CATEGORY_DOTS = [
  "rgb(var(--accent))",
  "rgb(var(--warn))",
  "rgb(var(--success))",
  "rgb(var(--danger))",
];

export default function ChatSidePanel({ threadId }) {
  const [budget, setBudget] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      listBudgets({ thread_id: threadId }),
      listExpenses({ thread_id: threadId }),
      getExpenseBreakdown({ thread_id: threadId }),
    ])
      .then(([budgetData, expenseData, breakdownData]) => {
        if (cancelled) return;

        // Most recently created active budget for this thread — the same
        // one budget_manager(status) would resolve without explicit dates.
        setBudget(budgetData.budgets[0] || null);
        setRecentExpenses(expenseData.expenses.slice(0, 4));

        const sorted = [...breakdownData.breakdown].sort(
          (a, b) => b.amount - a.amount
        );
        setTopCategories(sorted.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) {
          setBudget(null);
          setRecentExpenses([]);
          setTopCategories([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const maxCategoryAmount = Math.max(...topCategories.map((c) => c.amount), 1);

  if (loading) {
    return (
      <aside className="hidden w-[300px] shrink-0 border-l border-border bg-surface p-4 lg:block">
        <div className="animate-pulse space-y-4">
          <div className="h-40 rounded-xl bg-surface-hover" />
          <div className="h-32 rounded-xl bg-surface-hover" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-border bg-surface p-4 lg:block">
      <div className="flex flex-col gap-4">
        {budget && (
          <section className="rounded-xl border border-border bg-page p-4">
            <div className="mb-3 flex items-center gap-2">
              <Calendar size={13} className="text-accent" strokeWidth={1.8} />
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Budget summary
              </span>
            </div>
            <BudgetRing budget={budget} />
          </section>
        )}

        <section className="rounded-xl border border-border bg-page p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={13} className="text-accent" strokeWidth={1.8} />
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Recent expenses
              </span>
            </div>
            <Link
              to="/expenses"
              className="text-[11px] font-medium text-secondary hover:text-accent"
            >
              View all
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <p className="text-xs text-faint">Nothing logged in this chat yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-primary">{expense.category}</p>
                    <p className="text-[11px] text-faint">
                      {formatDate(expense.expense_date)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-medium text-danger">
                    {formatMoney(expense.amount, expense.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {topCategories.length > 0 && (
          <section className="rounded-xl border border-border bg-page p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={13} className="text-accent" strokeWidth={1.8} />
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  Top categories
                </span>
              </div>
              <span className="text-[11px] text-faint">This thread</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {topCategories.map((entry, i) => (
                <div key={`${entry.category}-${entry.currency}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">{entry.category}</span>
                    <span className="font-mono text-primary">
                      {formatMoney(entry.amount, entry.currency)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(entry.amount / maxCategoryAmount) * 100}%`,
                        backgroundColor: CATEGORY_DOTS[i % CATEGORY_DOTS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

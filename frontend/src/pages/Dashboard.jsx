import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  Activity,
  Database,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listMemories } from "../api/memories";
import { listExpenses } from "../api/expenses";
import { listBudgets } from "../api/budgets";
import { getErrorMessage } from "../utils/errorMessage";
import { formatRelative } from "../utils/formatDate";
import { formatMoney } from "../utils/currency";
import { getOrCreateThreadId } from "../utils/thread";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-success hover:bg-surface-hover"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-subtle text-accent">
        <Icon size={16} strokeWidth={1.9} />
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-primary">
          {title}
        </p>

        <p className="mt-0.5 text-sm leading-5 text-muted">
          {description}
        </p>
      </div>

      <ArrowRight
        size={15}
        className="mt-1 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [spendTotals, setSpendTotals] = useState({});
  const [budgets, setBudgets] = useState([]);
  const [spendLoading, setSpendLoading] = useState(true);
  const [spendError, setSpendError] = useState("");

  useEffect(() => {
    listMemories()
      .then((data) => setMemories(data.memories))
      .catch((err) =>
        setError(
          getErrorMessage(
            err,
            "Could not load memories."
          )
        )
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([
      listExpenses({ period: "this month" }),
      listBudgets(),
    ])
      .then(([expenseData, budgetData]) => {
        const totals = {};
        for (const expense of expenseData.expenses) {
          totals[expense.currency] =
            (totals[expense.currency] || 0) + expense.amount;
        }
        setSpendTotals(totals);
        setBudgets(budgetData.budgets);
      })
      .catch((err) =>
        setSpendError(
          getErrorMessage(err, "Could not load spending.")
        )
      )
      .finally(() => setSpendLoading(false));
  }, []);

  const recentMemories = useMemo(
    () =>
      [...memories]
        .sort(
          (a, b) =>
            new Date(b.created_at) -
            new Date(a.created_at)
        )
        .slice(0, 5),
    [memories]
  );

  const threadId = useMemo(
    () => getOrCreateThreadId(user.id),
    [user.id]
  );

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">

      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="flex items-start justify-between gap-5">

          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              Personal finance overview
            </p>

            <h1 className="text-xl font-semibold tracking-tight text-primary">
              Welcome back, {user.username}
            </h1>

            <p className="mt-1 text-sm text-muted">
              Here&apos;s what Mnemos currently knows.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-accent-border bg-accent-subtle px-3 py-2 sm:flex">
            <Activity
              size={14}
              className="text-accent"
              strokeWidth={1.8}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
              Agent active
            </span>
          </div>

        </header>


        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">

          <div className="flex flex-col gap-6">

            {/* Memory overview */}
            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">

              <div className="flex items-center justify-between border-b border-border px-5 py-4">

                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                    <Brain
                      size={14}
                      strokeWidth={1.8}
                    />
                  </div>

                  <h2 className="text-sm font-semibold text-primary">
                    Memory overview
                  </h2>
                </div>

                <Link
                  to="/memories"
                  className="text-xs font-medium text-secondary transition-colors hover:text-accent"
                >
                  View all
                </Link>

              </div>

              {loading ? (

                <div className="flex justify-center py-12">
                  <Spinner size={18} />
                </div>

              ) : error ? (

                <div className="p-5">
                  <EmptyState
                    icon={AlertTriangle}
                    title="Could not load memories"
                    description={error}
                  />
                </div>

              ) : (

                <div className="p-5">

                  <div className="flex items-end gap-3">
                    <p className="font-mono text-4xl font-semibold tracking-tight text-primary">
                      {memories.length}
                    </p>

                    <p className="pb-1 text-sm text-muted">
                      {memories.length === 1
                        ? "memory stored"
                        : "memories stored"}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-border">

                    {recentMemories.length === 0 ? (

                      <p className="pt-4 text-sm leading-6 text-muted">
                        Nothing stored yet — start a conversation
                        and Mnemos will save what matters.
                      </p>

                    ) : (

                      recentMemories.map((memory) => (
                        <div
                          key={memory.key}
                          className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0"
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />

                            <p className="min-w-0 flex-1 truncate text-sm text-secondary">
                              {memory.content}
                            </p>
                          </div>

                          <span className="shrink-0 font-mono text-[10px] text-faint">
                            {formatRelative(
                              memory.created_at
                            )}
                          </span>
                        </div>
                      ))

                    )}

                  </div>
                </div>
              )}

            </section>


            {/* Spending overview */}
            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">

              <div className="flex items-center justify-between border-b border-border px-5 py-4">

                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                    <Wallet
                      size={14}
                      strokeWidth={1.8}
                    />
                  </div>

                  <h2 className="text-sm font-semibold text-primary">
                    Spending this month
                  </h2>
                </div>

                <Link
                  to="/expenses"
                  className="text-xs font-medium text-secondary transition-colors hover:text-accent"
                >
                  View all
                </Link>

              </div>

              {spendLoading ? (

                <div className="flex justify-center py-12">
                  <Spinner size={18} />
                </div>

              ) : spendError ? (

                <div className="p-5">
                  <EmptyState
                    icon={AlertTriangle}
                    title="Could not load spending"
                    description={spendError}
                  />
                </div>

              ) : (

                <div className="p-5">

                  {Object.keys(spendTotals).length === 0 ? (
                    <p className="text-sm leading-6 text-muted">
                      Nothing logged yet this month — add an
                      expense from the Expenses page or from chat.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(spendTotals).map(([currency, amount]) => (
                        <div key={currency}>
                          <p className="font-mono text-3xl font-semibold tracking-tight text-primary">
                            {formatMoney(amount, currency)}
                          </p>
                          <p className="text-sm text-muted">
                            spent in {currency}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {budgets.length > 0 && (
                    <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
                      {budgets.slice(0, 3).map((budget) => (
                        <div key={budget.id}>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>{formatMoney(budget.amount, budget.currency)} budget</span>
                            <span>{budget.used_pct.toFixed(0)}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                            <div
                              className={`h-full rounded-full ${
                                budget.used_pct >= 100
                                  ? "bg-danger"
                                  : budget.used_pct >= 80
                                    ? "bg-warn"
                                    : "bg-success"
                              }`}
                              style={{ width: `${Math.min(budget.used_pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

            </section>


            {/* Quick actions */}
            <section>

              <div className="mb-3 flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Actions
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                <QuickAction
                  to="/chat"
                  icon={MessageSquare}
                  title="Open chat"
                  description="Continue your conversation with Mnemos."
                />

                <QuickAction
                  to="/expenses"
                  icon={Wallet}
                  title="View expenses"
                  description="See spending, budgets, and recurring rules."
                />

                <QuickAction
                  to="/memories"
                  icon={Brain}
                  title="Manage memories"
                  description="Review, edit, or remove stored context."
                />

              </div>
            </section>

          </div>


          <div className="flex flex-col gap-6">

            {/* Active session */}
            <section className="rounded-xl border border-border bg-surface p-5 shadow-[0_4px_16px_rgba(32,37,34,0.03)]">

              <div className="flex items-center gap-2">
                <Activity
                  size={15}
                  className="text-accent"
                  strokeWidth={1.8}
                />

                <h2 className="text-sm font-semibold text-primary">
                  Active session
                </h2>
              </div>

              <p className="mt-4 text-[11px] uppercase tracking-[0.08em] text-faint">
                Thread
              </p>

              <p className="mt-1 truncate font-mono text-xs text-secondary">
                {threadId}
              </p>

              <Link
                to="/chat"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
              >
                Continue chat
                <ArrowRight size={14} />
              </Link>

            </section>


            {/* Account */}
            <section className="rounded-xl border border-border bg-surface p-5 shadow-[0_4px_16px_rgba(32,37,34,0.03)]">

              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-subtle text-secondary">
                  <Database
                    size={14}
                    strokeWidth={1.8}
                  />
                </div>

                <h2 className="text-sm font-semibold text-primary">
                  Account
                </h2>
              </div>

              <dl className="mt-4 flex flex-col gap-3 text-sm">

                <div className="flex justify-between gap-3">
                  <dt className="text-muted">
                    Username
                  </dt>

                  <dd className="font-medium text-primary">
                    {user.username}
                  </dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted">
                    Email
                  </dt>

                  <dd className="min-w-0 truncate font-medium text-primary">
                    {user.email || "—"}
                  </dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted">
                    Status
                  </dt>

                  <dd className="font-medium text-accent">
                    {user.is_active
                      ? "Active"
                      : "Inactive"}
                  </dd>
                </div>

              </dl>

              <Link
                to="/profile"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-accent"
              >
                View profile
                <ArrowRight size={14} />
              </Link>

            </section>

          </div>

        </div>
      </div>
    </div>
  );
}
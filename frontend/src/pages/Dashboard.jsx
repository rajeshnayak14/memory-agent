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
  tint = "accent",
}) {
  const badgeClass =
    tint === "warm"
      ? "bg-warm-subtle text-warm"
      : "bg-accent-subtle text-accent";

  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-3xl border border-border bg-surface p-5 shadow-soft transition-colors hover:bg-surface-hover dark:shadow-none"
    >
      <div className={`icon-blob flex h-10 w-10 shrink-0 items-center justify-center ${badgeClass}`}>
        <Icon size={16} strokeWidth={1.9} />
      </div>

      <div className="flex-1">
        <p className="font-heading text-sm font-semibold text-primary">
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
            <p className="mb-1 text-sm text-muted">
              Personal finance overview
            </p>

            <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
              Welcome back, {user.username}
            </h1>

            <p className="mt-1 text-sm text-muted">
              Here&apos;s what Mnemos currently knows.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-accent-border bg-accent-subtle px-4 py-2 sm:flex">
            <Activity
              size={14}
              className="text-accent"
              strokeWidth={1.8}
            />
            <span className="text-xs font-medium text-accent">
              Agent active
            </span>
          </div>

        </header>


        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">

          <div className="flex flex-col gap-6">

            {/* Memory overview */}
            <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft dark:shadow-none">

              <div className="flex items-center justify-between border-b border-border px-6 py-5">

                <div className="flex items-center gap-3">
                  <div className="icon-blob flex h-9 w-9 items-center justify-center bg-accent-subtle text-accent">
                    <Brain
                      size={16}
                      strokeWidth={1.8}
                    />
                  </div>

                  <h2 className="font-heading text-base font-semibold text-primary">
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

                <div className="p-6">

                  <div className="flex items-end gap-3">
                    <p className="font-heading text-5xl font-bold tracking-tight text-accent">
                      {memories.length}
                    </p>

                    <p className="pb-1 text-sm text-muted">
                      {memories.length === 1
                        ? "little memory stored"
                        : "little memories stored"}
                    </p>
                  </div>

                  <div className="mt-6">

                    {recentMemories.length === 0 ? (

                      <p className="rounded-2xl bg-surface-subtle p-4 text-sm leading-6 text-muted">
                        Nothing stored yet — start a conversation
                        and Mnemos will save what matters.
                      </p>

                    ) : (

                      <div className="flex flex-col gap-2">
                        {recentMemories.map((memory) => (
                          <div
                            key={memory.key}
                            className="flex items-start justify-between gap-4 rounded-2xl bg-surface-subtle p-4"
                          >
                            <div className="flex min-w-0 items-start gap-2.5">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />

                              <p className="min-w-0 flex-1 truncate text-sm text-secondary">
                                {memory.content}
                              </p>
                            </div>

                            <span className="shrink-0 text-xs text-faint">
                              {formatRelative(
                                memory.created_at
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                    )}

                  </div>
                </div>
              )}

            </section>


            {/* Spending overview */}
            <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft dark:shadow-none">

              <div className="flex items-center justify-between border-b border-border px-6 py-5">

                <div className="flex items-center gap-3">
                  <div className="icon-blob flex h-9 w-9 items-center justify-center bg-warm-subtle text-warm">
                    <Wallet
                      size={16}
                      strokeWidth={1.8}
                    />
                  </div>

                  <h2 className="font-heading text-base font-semibold text-primary">
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

                <div className="p-6">
                  <EmptyState
                    icon={AlertTriangle}
                    title="Could not load spending"
                    description={spendError}
                  />
                </div>

              ) : (

                <div className="p-6">

                  {Object.keys(spendTotals).length === 0 ? (
                    <p className="text-sm leading-6 text-muted">
                      Nothing logged yet this month — add an
                      expense from the Expenses page or from chat.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(spendTotals).map(([currency, amount]) => (
                        <div key={currency}>
                          <p className="font-heading text-5xl font-bold tracking-tight text-primary">
                            {formatMoney(amount, currency)}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            spent in {currency}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {budgets.length > 0 && (
                    <div className="mt-6 flex flex-col gap-4">
                      {budgets.slice(0, 3).map((budget) => (
                        <div key={budget.id}>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>{formatMoney(budget.amount, budget.currency)} budget</span>
                            <span>{budget.used_pct.toFixed(0)}%</span>
                          </div>
                          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                            <div
                              className={`h-full rounded-full ${
                                budget.used_pct >= 100
                                  ? "bg-danger"
                                  : budget.used_pct >= 80
                                    ? "bg-warn"
                                    : "bg-gradient-to-r from-success to-accent"
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
                <p className="text-sm text-muted">
                  A few things you can do
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

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
                  tint="warm"
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
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-soft dark:shadow-none">

              <div className="flex items-center gap-3">
                <div className="icon-blob flex h-9 w-9 items-center justify-center bg-accent-subtle text-accent">
                  <Activity
                    size={16}
                    strokeWidth={1.8}
                  />
                </div>

                <h2 className="font-heading text-base font-semibold text-primary">
                  Active session
                </h2>
              </div>

              <p className="mt-5 text-xs text-faint">
                Thread
              </p>

              <p className="mt-1 truncate rounded-3xl bg-surface-subtle px-3 py-2 font-mono text-xs text-secondary">
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
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-soft dark:shadow-none">

              <div className="flex items-center gap-3">
                <div className="icon-blob flex h-9 w-9 items-center justify-center bg-surface-subtle text-secondary">
                  <Database
                    size={16}
                    strokeWidth={1.8}
                  />
                </div>

                <h2 className="font-heading text-base font-semibold text-primary">
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
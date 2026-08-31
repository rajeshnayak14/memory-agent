import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Plus,
  AlertTriangle,
  Receipt,
  PiggyBank,
  Repeat,
  BarChart3,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../utils/errorMessage";
import { getOrCreateThreadId } from "../utils/thread";
import { formatMoney } from "../utils/currency";

import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseBreakdown,
} from "../api/expenses";
import {
  listBudgets,
  createBudget,
  deleteBudget,
} from "../api/budgets";
import {
  listRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  listRecurringBudgets,
  createRecurringBudget,
  updateRecurringBudget,
  deleteRecurringBudget,
} from "../api/recurring";

import Button from "../components/Button";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import ExpenseEditor from "../components/ExpenseEditor";
import ExpenseRow from "../components/ExpenseRow";
import BudgetCard from "../components/BudgetCard";
import BudgetEditor from "../components/BudgetEditor";
import RecurringRow from "../components/RecurringRow";
import RecurringExpenseEditor from "../components/RecurringExpenseEditor";
import RecurringBudgetEditor from "../components/RecurringBudgetEditor";
import CategoryChart from "../components/CategoryChart";

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "this week", label: "This week" },
  { value: "this month", label: "This month" },
  { value: "", label: "All time" },
];

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-muted" strokeWidth={1.8} />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {title}
        </span>
      </div>
      {action}
    </div>
  );
}

export default function Expenses() {
  const { user } = useAuth();
  const { notify } = useToast();

  const defaultThreadId = useMemo(
    () => getOrCreateThreadId(user.id),
    [user.id]
  );
  const defaultCurrency = user.preferred_currency || "INR";

  const [period, setPeriod] = useState("this month");

  const [expenses, setExpenses] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState("");

  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(true);

  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [recurringBudgets, setRecurringBudgets] = useState([]);
  const [recurringLoading, setRecurringLoading] = useState(true);

  const [creatingExpense, setCreatingExpense] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [updatingExpenseId, setUpdatingExpenseId] = useState(null);

  const [creatingBudget, setCreatingBudget] = useState(false);
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);

  const [creatingRecExpense, setCreatingRecExpense] = useState(false);
  const [creatingRecBudget, setCreatingRecBudget] = useState(false);
  const [recSubmitting, setRecSubmitting] = useState(false);
  const [busyRecurringId, setBusyRecurringId] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const refreshExpenses = useCallback(() => {
    const params = period ? { period } : {};
    return Promise.all([
      listExpenses(params).then((data) => setExpenses(data.expenses)),
      getExpenseBreakdown(params).then((data) => setBreakdown(data.breakdown)),
    ]);
  }, [period]);

  const refreshBudgets = useCallback(() => {
    return listBudgets().then((data) => setBudgets(data.budgets));
  }, []);

  const refreshRecurring = useCallback(() => {
    return Promise.all([
      listRecurringExpenses().then((data) =>
        setRecurringExpenses(data.recurring_expenses)
      ),
      listRecurringBudgets().then((data) =>
        setRecurringBudgets(data.recurring_budgets)
      ),
    ]);
  }, []);

  useEffect(() => {
    setExpensesLoading(true);
    refreshExpenses()
      .catch((err) =>
        setExpensesError(getErrorMessage(err, "Could not load expenses."))
      )
      .finally(() => setExpensesLoading(false));
  }, [refreshExpenses]);

  useEffect(() => {
    setBudgetsLoading(true);
    refreshBudgets()
      .catch(() => {})
      .finally(() => setBudgetsLoading(false));
  }, [refreshBudgets]);

  useEffect(() => {
    setRecurringLoading(true);
    refreshRecurring()
      .catch(() => {})
      .finally(() => setRecurringLoading(false));
  }, [refreshRecurring]);

  const totalsByCurrency = useMemo(() => {
    const totals = {};
    for (const expense of expenses) {
      totals[expense.currency] = (totals[expense.currency] || 0) + expense.amount;
    }
    return totals;
  }, [expenses]);

  // ------------------------------------------------------------
  // Expenses
  // ------------------------------------------------------------

  const handleCreateExpense = async (payload) => {
    setExpenseSubmitting(true);
    try {
      await createExpense({ thread_id: defaultThreadId, ...payload });
      await refreshExpenses();
      setCreatingExpense(false);
      notify("Expense added.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not add expense."), { type: "error" });
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleUpdateExpense = async (id, changes) => {
    setUpdatingExpenseId(id);
    try {
      await updateExpense(id, changes);
      await refreshExpenses();
      notify("Expense updated.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not update expense."), { type: "error" });
      throw err;
    } finally {
      setUpdatingExpenseId(null);
    }
  };

  // ------------------------------------------------------------
  // Budgets
  // ------------------------------------------------------------

  const handleCreateBudget = async (payload) => {
    setBudgetSubmitting(true);
    try {
      await createBudget({ thread_id: defaultThreadId, ...payload });
      await refreshBudgets();
      setCreatingBudget(false);
      notify("Budget created.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not create budget."), { type: "error" });
    } finally {
      setBudgetSubmitting(false);
    }
  };

  // ------------------------------------------------------------
  // Recurring
  // ------------------------------------------------------------

  const handleCreateRecExpense = async (payload) => {
    setRecSubmitting(true);
    try {
      await createRecurringExpense({ thread_id: defaultThreadId, ...payload });
      await refreshRecurring();
      setCreatingRecExpense(false);
      notify("Recurring expense created.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not create recurring expense."), {
        type: "error",
      });
    } finally {
      setRecSubmitting(false);
    }
  };

  const handleCreateRecBudget = async (payload) => {
    setRecSubmitting(true);
    try {
      await createRecurringBudget({ thread_id: defaultThreadId, ...payload });
      await refreshRecurring();
      setCreatingRecBudget(false);
      notify("Recurring budget created.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not create recurring budget."), {
        type: "error",
      });
    } finally {
      setRecSubmitting(false);
    }
  };

  const handleToggleRecExpense = async (rule) => {
    setBusyRecurringId(`exp-${rule.id}`);
    try {
      await updateRecurringExpense(rule.id, { active: !rule.active });
      await refreshRecurring();
    } catch (err) {
      notify(getErrorMessage(err, "Could not update recurring expense."), {
        type: "error",
      });
    } finally {
      setBusyRecurringId(null);
    }
  };

  const handleToggleRecBudget = async (rule) => {
    setBusyRecurringId(`bud-${rule.id}`);
    try {
      await updateRecurringBudget(rule.id, { active: !rule.active });
      await refreshRecurring();
    } catch (err) {
      notify(getErrorMessage(err, "Could not update recurring budget."), {
        type: "error",
      });
    } finally {
      setBusyRecurringId(null);
    }
  };

  // ------------------------------------------------------------
  // Delete (shared confirm dialog across all four resource kinds)
  // ------------------------------------------------------------

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteSubmitting(true);

    try {
      if (pendingDelete.kind === "expense") {
        await deleteExpense(pendingDelete.item.id);
        await refreshExpenses();
        notify("Expense deleted.");
      } else if (pendingDelete.kind === "budget") {
        await deleteBudget(pendingDelete.item.id);
        await refreshBudgets();
        notify("Budget deleted.");
      } else if (pendingDelete.kind === "recurringExpense") {
        await deleteRecurringExpense(pendingDelete.item.id);
        await refreshRecurring();
        notify("Recurring expense deleted.");
      } else if (pendingDelete.kind === "recurringBudget") {
        await deleteRecurringBudget(pendingDelete.item.id);
        await refreshRecurring();
        notify("Recurring budget deleted.");
      }
      setPendingDelete(null);
    } catch (err) {
      notify(getErrorMessage(err, "Could not delete."), { type: "error" });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle text-accent">
              <Wallet size={19} strokeWidth={1.8} />
            </div>
            <div>
              <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Personal ledger
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-primary">
                Expenses
              </h1>
              <p className="mt-1 text-sm text-muted">
                Across every conversation — not just this thread.
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            icon={Plus}
            onClick={() => setCreatingExpense((v) => !v)}
          >
            Add expense
          </Button>
        </header>

        {/* Period filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.value
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-accent-border bg-surface text-secondary hover:bg-surface-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Totals */}
        {!expensesLoading && Object.keys(totalsByCurrency).length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3">
            {Object.entries(totalsByCurrency).map(([currency, amount]) => (
              <div
                key={currency}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
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

        {/* Create expense */}
        {creatingExpense && (
          <div className="mt-6">
            <ExpenseEditor
              defaultCurrency={defaultCurrency}
              submitting={expenseSubmitting}
              saveLabel="Add expense"
              onCancel={() => setCreatingExpense(false)}
              onSave={handleCreateExpense}
            />
          </div>
        )}

        {/* Category breakdown */}
        {breakdown.length > 0 && (
          <section className="mt-7 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
            <SectionHeader icon={BarChart3} title="By category" />
            <div className="p-4">
              <CategoryChart breakdown={breakdown} />
            </div>
          </section>
        )}

        {/* Expense list */}
        <div className="mt-7">
          {expensesLoading ? (
            <div className="flex justify-center rounded-xl border border-border bg-surface py-16">
              <Spinner size={20} />
            </div>
          ) : expensesError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Could not load expenses"
              description={expensesError}
            />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses for this period"
              description="Log one above, or from chat — either way it shows up here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
              <SectionHeader
                icon={Receipt}
                title="Expenses"
                action={
                  <span className="font-mono text-[10px] text-faint">
                    {expenses.length}
                  </span>
                }
              />
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  defaultCurrency={defaultCurrency}
                  updating={updatingExpenseId === expense.id}
                  onUpdate={handleUpdateExpense}
                  onDelete={(item) => setPendingDelete({ kind: "expense", item })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Budgets */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank size={15} className="text-accent" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold text-primary">Budgets</h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setCreatingBudget((v) => !v)}
            >
              Add budget
            </Button>
          </div>

          {creatingBudget && (
            <div className="mb-4">
              <BudgetEditor
                defaultCurrency={defaultCurrency}
                submitting={budgetSubmitting}
                onCancel={() => setCreatingBudget(false)}
                onSave={handleCreateBudget}
              />
            </div>
          )}

          {budgetsLoading ? (
            <div className="flex justify-center rounded-xl border border-border bg-surface py-10">
              <Spinner size={18} />
            </div>
          ) : budgets.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No budgets set"
              description="Set one above, or ask the assistant in chat."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onDelete={(item) => setPendingDelete({ kind: "budget", item })}
                  deleting={
                    pendingDelete?.kind === "budget" &&
                    pendingDelete.item.id === budget.id &&
                    deleteSubmitting
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Recurring */}
        <section className="mt-8 mb-4">
          <div className="mb-3 flex items-center gap-2">
            <Repeat size={15} className="text-accent" strokeWidth={1.8} />
            <h2 className="text-sm font-semibold text-primary">Recurring</h2>
          </div>

          {recurringLoading ? (
            <div className="flex justify-center rounded-xl border border-border bg-surface py-10">
              <Spinner size={18} />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Recurring expenses */}
              <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
                <SectionHeader
                  icon={Receipt}
                  title="Recurring expenses"
                  action={
                    <button
                      type="button"
                      onClick={() => setCreatingRecExpense((v) => !v)}
                      className="text-xs font-medium text-secondary transition-colors hover:text-accent"
                    >
                      + Add
                    </button>
                  }
                />

                {creatingRecExpense && (
                  <div className="p-3">
                    <RecurringExpenseEditor
                      defaultCurrency={defaultCurrency}
                      submitting={recSubmitting}
                      onCancel={() => setCreatingRecExpense(false)}
                      onSave={handleCreateRecExpense}
                    />
                  </div>
                )}

                {recurringExpenses.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-faint">
                    No recurring expenses.
                  </p>
                ) : (
                  recurringExpenses.map((rule) => (
                    <RecurringRow
                      key={rule.id}
                      label={`${rule.category} · ${rule.description}`}
                      amount={rule.amount}
                      currency={rule.currency}
                      frequency={rule.frequency}
                      nextDate={rule.next_run_date}
                      active={rule.active}
                      busy={busyRecurringId === `exp-${rule.id}`}
                      onToggleActive={() => handleToggleRecExpense(rule)}
                      onDelete={() =>
                        setPendingDelete({ kind: "recurringExpense", item: rule })
                      }
                    />
                  ))
                )}
              </div>

              {/* Recurring budgets */}
              <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
                <SectionHeader
                  icon={PiggyBank}
                  title="Recurring budgets"
                  action={
                    <button
                      type="button"
                      onClick={() => setCreatingRecBudget((v) => !v)}
                      className="text-xs font-medium text-secondary transition-colors hover:text-accent"
                    >
                      + Add
                    </button>
                  }
                />

                {creatingRecBudget && (
                  <div className="p-3">
                    <RecurringBudgetEditor
                      defaultCurrency={defaultCurrency}
                      submitting={recSubmitting}
                      onCancel={() => setCreatingRecBudget(false)}
                      onSave={handleCreateRecBudget}
                    />
                  </div>
                )}

                {recurringBudgets.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-faint">
                    No recurring budgets.
                  </p>
                ) : (
                  recurringBudgets.map((rule) => (
                    <RecurringRow
                      key={rule.id}
                      label="budget"
                      amount={rule.amount}
                      currency={rule.currency}
                      frequency={rule.frequency}
                      nextDate={rule.next_period_start}
                      active={rule.active}
                      busy={busyRecurringId === `bud-${rule.id}`}
                      onToggleActive={() => handleToggleRecBudget(rule)}
                      onDelete={() =>
                        setPendingDelete({ kind: "recurringBudget", item: rule })
                      }
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {/* Delete confirmation (shared across all resource kinds) */}
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title={
            pendingDelete?.kind === "expense"
              ? "Delete this expense?"
              : pendingDelete?.kind === "budget"
                ? "Delete this budget?"
                : "Delete this recurring rule?"
          }
          description="This can't be undone."
          confirmLabel="Delete"
          loading={deleteSubmitting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
}

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate } from "../utils/formatDate";
import { formatMoney } from "../utils/currency";
import ExpenseEditor from "./ExpenseEditor";

export default function ExpenseRow({
  expense,
  defaultCurrency,
  onUpdate,
  onDelete,
  updating,
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-border px-4 py-4 last:border-b-0">
        <ExpenseEditor
          initial={expense}
          defaultCurrency={defaultCurrency}
          submitting={updating}
          saveLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSave={(changes) =>
            onUpdate(expense.id, changes).then(() => setEditing(false))
          }
        />
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-4 border-b border-border bg-surface px-4 py-4 transition-colors last:border-b-0 hover:bg-surface-hover">
      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-mono text-sm font-semibold text-primary">
            {formatMoney(expense.amount, expense.currency)}
          </p>
          <p className="text-sm text-secondary">{expense.category}</p>
        </div>

        <p className="mt-0.5 truncate text-sm text-muted">
          {expense.description}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
          <span>{formatDate(expense.expense_date)}</span>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit expense"
          className="rounded-lg p-2 text-faint transition-colors hover:bg-accent-subtle hover:text-accent"
        >
          <Pencil size={15} strokeWidth={1.9} />
        </button>

        <button
          type="button"
          onClick={() => onDelete(expense)}
          aria-label="Delete expense"
          className="rounded-lg p-2 text-faint transition-colors hover:bg-danger-subtle hover:text-danger"
        >
          <Trash2 size={15} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}

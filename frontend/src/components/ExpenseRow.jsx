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
  selected,
  onSelect,
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
    <div className={`group flex items-start gap-3 border-b border-border px-4 py-4 transition-colors last:border-b-0 ${selected ? "bg-accent-subtle" : "bg-surface hover:bg-surface-hover"}`}>
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(expense.id)}
          aria-label="Select expense"
          className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer accent-accent"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-heading text-base font-bold text-primary">
            {formatMoney(expense.amount, expense.currency)}
          </p>
          <p className="text-sm text-secondary">{expense.category}</p>
        </div>

        <p className="mt-0.5 truncate text-sm text-muted">
          {expense.description}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint">
          <span>{formatDate(expense.expense_date)}</span>
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit expense"
          className="rounded-full p-2 text-faint transition-colors hover:bg-accent-subtle hover:text-accent"
        >
          <Pencil size={15} strokeWidth={1.9} />
        </button>

        <button
          type="button"
          onClick={() => onDelete(expense)}
          aria-label="Delete expense"
          className="rounded-full p-2 text-faint transition-colors hover:bg-danger-subtle hover:text-danger"
        >
          <Trash2 size={15} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}

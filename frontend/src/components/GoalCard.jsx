import { useState } from "react";
import { Trash2, PiggyBank } from "lucide-react";
import { formatMoney } from "../utils/currency";
import { formatDate } from "../utils/formatDate";
import Button from "./Button";

export default function GoalCard({
  goal,
  onContribute,
  onDelete,
  deleting,
  contributing,
}) {
  const [addingFunds, setAddingFunds] = useState(false);
  const [amount, setAmount] = useState("");

  const pct = goal.target_amount
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0;

  const handleContribute = () => {
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed === 0) return;
    onContribute(goal.id, parsed).then(() => {
      setAmount("");
      setAddingFunds(false);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_4px_16px_rgba(32,37,34,0.03)] dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
            <PiggyBank size={15} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">{goal.name}</p>
            {goal.target_date && (
              <p className="text-xs text-faint">
                by {formatDate(goal.target_date)}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(goal)}
          disabled={deleting}
          aria-label="Delete goal"
          className="shrink-0 rounded-lg p-1.5 text-faint transition-colors hover:bg-danger-subtle hover:text-danger disabled:opacity-50"
        >
          <Trash2 size={14} strokeWidth={1.9} />
        </button>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{formatMoney(goal.current_amount, goal.currency)} saved</span>
        <span>{formatMoney(goal.target_amount, goal.currency)} goal</span>
      </div>

      {addingFunds ? (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            step="0.01"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-primary outline-none focus:border-focus"
          />
          <Button variant="ghost" size="sm" onClick={() => setAddingFunds(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleContribute}
            loading={contributing}
          >
            Add
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setAddingFunds(true)}
        >
          Add funds
        </Button>
      )}
    </div>
  );
}

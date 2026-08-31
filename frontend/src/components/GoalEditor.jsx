import { useState } from "react";
import Button from "./Button";
import { CURRENCY_CODES } from "../utils/currency";

const inputClass =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-faint focus:border-focus";

export default function GoalEditor({
  defaultCurrency = "INR",
  submitting = false,
  onSave,
  onCancel,
}) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [error, setError] = useState("");

  const handleSave = () => {
    const parsedTarget = Number(targetAmount);

    if (!name.trim()) {
      setError("Goal name is required.");
      return;
    }

    if (!targetAmount || Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      setError("Target amount must be greater than zero.");
      return;
    }

    setError("");

    onSave({
      name: name.trim(),
      target_amount: parsedTarget,
      currency,
      target_date: targetDate || undefined,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Goal name"
          className={`col-span-2 ${inputClass}`}
        />

        <input
          type="number"
          min="0.01"
          step="0.01"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="Target amount"
          className={inputClass}
        />

        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={inputClass}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={`col-span-2 ${inputClass}`}
        />
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>

        <Button variant="accent" size="sm" onClick={handleSave} loading={submitting}>
          Create goal
        </Button>
      </div>
    </div>
  );
}

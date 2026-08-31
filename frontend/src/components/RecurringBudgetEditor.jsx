import { useState } from "react";
import Button from "./Button";
import { CURRENCY_CODES, todayIso } from "../utils/currency";

const inputClass =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-faint focus:border-focus";

const FREQUENCIES = ["weekly", "monthly"];

export default function RecurringBudgetEditor({
  defaultCurrency = "INR",
  submitting = false,
  onSave,
  onCancel,
}) {
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(todayIso());
  const [currency, setCurrency] = useState(defaultCurrency);
  const [error, setError] = useState("");

  const handleSave = () => {
    const parsedAmount = Number(amount);

    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setError("");

    onSave({
      amount: parsedAmount,
      frequency,
      start_date: startDate,
      currency,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
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

        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className={inputClass}
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>

        <Button variant="accent" size="sm" onClick={handleSave} loading={submitting}>
          Create recurring budget
        </Button>
      </div>
    </div>
  );
}

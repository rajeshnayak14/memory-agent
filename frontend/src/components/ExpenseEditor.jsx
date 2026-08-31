import { useState } from "react";
import Button from "./Button";
import { CURRENCY_CODES, todayIso } from "../utils/currency";

const inputClass =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-faint focus:border-focus";

export default function ExpenseEditor({
  initial = {},
  defaultCurrency = "INR",
  submitting = false,
  saveLabel = "Save",
  onSave,
  onCancel,
}) {
  const [amount, setAmount] = useState(initial.amount ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [date, setDate] = useState(
    initial.expense_date ? initial.expense_date.slice(0, 10) : todayIso()
  );
  const [currency, setCurrency] = useState(initial.currency ?? defaultCurrency);
  const [error, setError] = useState("");

  const handleSave = () => {
    const parsedAmount = Number(amount);

    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!category.trim()) {
      setError("Category is required.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    setError("");

    onSave({
      amount: parsedAmount,
      category: category.trim(),
      description: description.trim(),
      date,
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

        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className={inputClass}
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className={`mt-2 ${inputClass}`}
      />

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>

        <Button variant="accent" size="sm" onClick={handleSave} loading={submitting}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

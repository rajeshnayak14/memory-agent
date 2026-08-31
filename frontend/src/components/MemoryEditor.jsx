import { useState } from "react";
import Button from "./Button";

export default function MemoryEditor({
  initialValue = "",
  onSave,
  onCancel,
  submitting = false,
  saveLabel = "Save",
  autoFocus = false,
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");

  const handleSave = () => {
    const trimmed = value.trim();

    if (!trimmed) {
      setError("Memory content can't be empty.");
      return;
    }

    if (trimmed.length > 2000) {
      setError("Memory content must be 2000 characters or fewer.");
      return;
    }

    setError("");
    onSave(trimmed);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3">

      <textarea
        autoFocus={autoFocus}
        rows={3}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError("");
        }}
        placeholder="What should Mnemos remember?"
        className="w-full resize-none rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm leading-6 text-primary outline-none transition-colors placeholder:text-faint focus:border-focus"
      />

      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-faint">
          {value.length}/2000
        </span>

        {error && (
          <p className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>

        <Button
          variant="accent"
          size="sm"
          onClick={handleSave}
          loading={submitting}
        >
          {saveLabel}
        </Button>
      </div>

    </div>
  );
}
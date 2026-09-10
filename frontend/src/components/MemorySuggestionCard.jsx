import { Brain, Check } from "lucide-react";
import Button from "./Button";

export default function MemorySuggestionCard({ suggestion, onAccept, onDecline }) {
  const status = suggestion.status || "pending";

  if (status === "dismissed") return null;

  if (status === "accepted") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-accent-border bg-accent-subtle px-3.5 py-2.5 text-sm text-accent">
        <Check size={14} strokeWidth={2.2} />
        Remembered for future conversations.
      </div>
    );
  }

  const saving = status === "saving";

  return (
    <div className="mt-2 w-full max-w-sm rounded-3xl border border-border bg-surface p-4 shadow-soft dark:shadow-none">
      <div className="flex items-start gap-2.5">
        <div className="icon-blob flex h-8 w-8 shrink-0 items-center justify-center bg-accent-subtle text-accent">
          <Brain size={15} strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-primary">{suggestion.message}</p>

          <p className="mt-2 rounded-2xl bg-surface-subtle px-3 py-2 text-sm italic text-secondary">
            "{suggestion.memory}"
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" size="sm" disabled={saving} onClick={onDecline}>
          No
        </Button>

        <Button variant="accent" size="sm" loading={saving} onClick={onAccept}>
          Yes, remember it
        </Button>
      </div>
    </div>
  );
}

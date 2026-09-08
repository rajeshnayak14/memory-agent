import { useState } from "react";
import { Brain, Check, RefreshCw, Pencil } from "lucide-react";
import BudgetSummaryCard from "./BudgetSummaryCard";
import ExpenseBreakdownCard from "./ExpenseBreakdownCard";
import DailyBreakdownCard from "./DailyBreakdownCard";

function Avatar({ isUser }) {
  if (isUser) return null;

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
      <Brain size={15} strokeWidth={1.9} />
    </div>
  );
}

export default function ChatMessageRow({ message, onRetry, onEditSubmit }) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isSending = message.status === "sending";
  const canEdit = isUser && message.status === "sent" && Boolean(onEditSubmit);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const startEdit = () => {
    setDraft(message.content);
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setIsEditing(false);
    if (trimmed !== message.content) {
      onEditSubmit(message, trimmed);
    }
  };

  // Whenever a structured card is attached, the model's own text is just
  // a prose/bullet restatement of the exact same numbers the card shows
  // (that's how every card-producing reply reads) — showing both is
  // pure duplication, so the card replaces the text bubble rather than
  // sitting alongside it.
  const hasCard = !isUser && Boolean(message.card);

  const bubbleClass = isUser
    ? "bg-accent-subtle text-primary"
    : isError
      ? "border border-danger-border bg-danger-subtle text-danger"
      : "border border-border bg-surface text-primary";

  return (
    <div className={`group flex gap-3 py-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar isUser={isUser} />

      <div className={`flex max-w-[75%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        {isEditing ? (
          <div className="w-full min-w-[240px] rounded-2xl border border-focus bg-surface px-3 py-2.5">
            <textarea
              autoFocus
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  saveEdit();
                } else if (event.key === "Escape") {
                  cancelEdit();
                }
              }}
              className="w-full resize-none bg-transparent text-sm leading-6 text-primary outline-none"
            />

            <div className="mt-1.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-secondary transition-colors hover:bg-surface-hover"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={!draft.trim()}
                className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save &amp; regenerate
              </button>
            </div>
          </div>
        ) : (
          !hasCard && (
            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${bubbleClass}`}>
              <p className="whitespace-pre-wrap">{message.content}</p>

              {isSending && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60" />
                  <span className="text-xs opacity-70">Sending…</span>
                </div>
              )}
            </div>
          )
        )}

        {!isUser && message.card?.type === "budget_summary" && (
          <div className="w-full max-w-sm">
            <BudgetSummaryCard card={message.card} />
          </div>
        )}

        {!isUser && message.card?.type === "expense_breakdown" && (
          <div className="w-full max-w-sm">
            <ExpenseBreakdownCard card={message.card} />
          </div>
        )}

        {!isUser && message.card?.type === "daily_breakdown" && (
          <div className="w-full max-w-sm">
            <DailyBreakdownCard card={message.card} />
          </div>
        )}

        {!isEditing && (
          <div className="mt-1 flex items-center gap-1.5 px-1">
            <span className="font-mono text-[10px] text-faint">{message.time}</span>

            {isUser && message.status === "sent" && (
              <Check size={11} strokeWidth={2.2} className="text-faint" />
            )}

            {canEdit && (
              <button
                type="button"
                onClick={startEdit}
                aria-label="Edit message"
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Pencil size={11} strokeWidth={2} className="text-faint hover:text-primary" />
              </button>
            )}
          </div>
        )}

        {isError && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-danger-border bg-danger-subtle px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-subtle/70"
          >
            <RefreshCw size={12} strokeWidth={2} />
            Retry message
          </button>
        )}
      </div>
    </div>
  );
}

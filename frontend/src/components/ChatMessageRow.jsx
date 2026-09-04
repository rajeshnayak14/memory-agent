import { Brain, Check, RefreshCw } from "lucide-react";
import BudgetSummaryCard from "./BudgetSummaryCard";
import ExpenseBreakdownCard from "./ExpenseBreakdownCard";

function Avatar({ isUser }) {
  if (isUser) return null;

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
      <Brain size={15} strokeWidth={1.9} />
    </div>
  );
}

export default function ChatMessageRow({ message, onRetry }) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isSending = message.status === "sending";

  const bubbleClass = isUser
    ? "bg-accent-subtle text-primary"
    : isError
      ? "border border-danger-border bg-danger-subtle text-danger"
      : "border border-border bg-surface text-primary";

  return (
    <div className={`flex gap-3 py-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar isUser={isUser} />

      <div className={`flex max-w-[75%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${bubbleClass}`}>
          <p className="whitespace-pre-wrap">{message.content}</p>

          {isSending && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60" />
              <span className="text-xs opacity-70">Sending…</span>
            </div>
          )}
        </div>

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

        <div className="mt-1 flex items-center gap-1.5 px-1">
          <span className="font-mono text-[10px] text-faint">{message.time}</span>

          {isUser && message.status === "sent" && (
            <Check size={11} strokeWidth={2.2} className="text-faint" />
          )}
        </div>

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

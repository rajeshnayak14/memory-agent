import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.tools.expense_tools import (
    _budget_spent,
    normalize_budget_action,
    resolve_budget_target,
    resolve_expense_breakdown,
)


class BudgetSummaryCard(BaseModel):
    type: Literal["budget_summary"] = "budget_summary"
    amount: float
    spent: float
    remaining: float
    currency: str
    period_start: datetime
    period_end: datetime


class ExpenseBreakdownItem(BaseModel):
    category: str
    currency: str
    amount: float


class CurrencyTotal(BaseModel):
    currency: str
    amount: float


class ExpenseBreakdownCard(BaseModel):
    type: Literal["expense_breakdown"] = "expense_breakdown"
    items: list[ExpenseBreakdownItem]
    totals: list[CurrencyTotal]


ChatCard = BudgetSummaryCard | ExpenseBreakdownCard


def segment_into_turns(messages: list) -> list[list]:
    """Split the full checkpointed message list into per-turn segments,
    each starting at a HumanMessage and running up to (not including) the
    next one.

    Shared by the live /chat response (which only needs the last turn)
    and conversation-history reconstruction (which needs every turn — a
    reply's card has to be the same on reload as it was when first
    generated, which requires resolving it per-turn rather than just
    once against the whole thread).
    """
    turns = []
    current = None

    for message in messages:
        if message.type == "human":
            current = [message]
            turns.append(current)
        elif current is not None:
            current.append(message)

    return turns


def extract_final_reply_text(turn_messages: list) -> str:
    """The last non-tool-call AI message with content in a turn — the
    same extraction the live /chat response uses, generalized to any
    turn segment so history reconstruction computes an identical answer.
    """
    content = ""

    for message in reversed(turn_messages):
        if message.type != "ai":
            continue

        if getattr(message, "tool_calls", None):
            continue

        if not message.content:
            continue

        content = message.content
        break

    if isinstance(content, list):
        content = " ".join(
            item.get("text", "")
            for item in content
            if isinstance(item, dict) and item.get("text")
        )

    return str(content).strip()


def _find_successful_tool_call(turn_messages: list, tool_name: str, predicate=None):
    """Find the last call to `tool_name` in this turn whose result
    succeeded. `predicate(args)` optionally filters further (e.g. only a
    budget_manager call whose action is "status")."""
    matched_call = None

    for message in turn_messages:
        if message.type != "ai" or not getattr(message, "tool_calls", None):
            continue

        for tool_call in message.tool_calls:
            if tool_call["name"] != tool_name:
                continue

            if predicate and not predicate(tool_call["args"]):
                continue

            matched_call = tool_call  # last match in the turn wins

    if matched_call is None:
        return None

    tool_message = next(
        (
            m for m in turn_messages
            if m.type == "tool" and m.tool_call_id == matched_call["id"]
        ),
        None,
    )

    if tool_message is None or tool_message.status != "success":
        return None

    return matched_call


def find_budget_summary_card(
    db, user_id: int, thread_id: str, turn_messages: list,
) -> BudgetSummaryCard | None:
    """Re-resolve a budget_manager(status) call made in this turn into a
    structured card, if one was made."""
    status_call = _find_successful_tool_call(
        turn_messages,
        "budget_manager",
        predicate=lambda args: normalize_budget_action(args.get("action")) == "status",
    )

    if status_call is None:
        return None

    # Re-resolve the exact same target the tool call itself resolved —
    # this is safe to re-query here because every tool opens/commits its
    # own session, so by the time the turn's messages exist in the
    # checkpoint, everything the tool touched is already committed.
    all_threads = bool(status_call["args"].get("search_all_conversations"))

    target, *_ = resolve_budget_target(
        db,
        user_id,
        thread_id,
        status_call["args"].get("start_date"),
        status_call["args"].get("end_date"),
        all_threads,
        status_call["args"].get("period"),
    )

    if target is None:
        return None

    spent = _budget_spent(db, user_id, thread_id, target, all_threads)

    return BudgetSummaryCard(
        amount=target.amount,
        spent=spent,
        remaining=target.amount - spent,
        currency=target.currency,
        period_start=target.period_start,
        period_end=target.period_end,
    )


# A bullet line shaped like "- category: ₹amount" / "*   **category:** ₹amount"
# — how the model renders a category breakdown in prose. Under a long,
# repetitive conversation history the model sometimes answers a spending
# question by reciting an earlier tool result from its own context instead
# of calling get_expense_breakdown again this turn (confirmed empirically:
# up to ~40% of turns on a heavily-repeated real thread) — prompt wording
# alone couldn't close this reliably, so when that happens and the
# response still reads as a breakdown, the card is still attached below by
# computing the CURRENT real breakdown directly, independent of whether
# the model made the tool call.
_BREAKDOWN_LINE_RE = re.compile(
    r"^[ \t]*[-*][ \t]+\*{0,2}[^:*\n]+\*{0,2}:\*{0,2}[ \t]*[₹$€£]",
    re.MULTILINE,
)


def _looks_like_expense_breakdown_text(text: str) -> bool:
    return len(_BREAKDOWN_LINE_RE.findall(text)) >= 2


def find_expense_breakdown_card(
    db, user_id: int, thread_id: str, turn_messages: list, response_text: str,
) -> ExpenseBreakdownCard | None:
    """Resolve this turn's category breakdown into a structured card,
    either re-resolving a get_expense_breakdown call made in this turn
    (the normal case), or — if none was made but the reply still reads
    like a breakdown — falling back to the default (no date/period)
    breakdown so the card stays accurate regardless of what the model
    did.
    """
    breakdown_call = _find_successful_tool_call(turn_messages, "get_expense_breakdown")

    if breakdown_call is not None:
        date_arg = breakdown_call["args"].get("date")
        period_arg = breakdown_call["args"].get("period")
    elif _looks_like_expense_breakdown_text(response_text):
        date_arg = None
        period_arg = None
    else:
        return None

    breakdown, totals_by_currency, error = resolve_expense_breakdown(
        db, user_id, thread_id, date_arg, period_arg,
    )

    if error or not breakdown:
        return None

    return ExpenseBreakdownCard(
        items=[
            ExpenseBreakdownItem(category=category, currency=currency, amount=amount)
            for (category, currency), amount in sorted(breakdown.items())
        ],
        totals=[
            CurrencyTotal(currency=currency, amount=amount)
            for currency, amount in sorted(totals_by_currency.items())
        ],
    )


def find_card_for_turn(
    db, user_id: int, thread_id: str, turn_messages: list, response_text: str,
) -> ChatCard | None:
    """Resolve whichever structured card (if any) this turn's reply
    should carry — the single entry point both the live /chat response
    and conversation-history reconstruction call."""
    return (
        find_budget_summary_card(db, user_id, thread_id, turn_messages)
        or find_expense_breakdown_card(db, user_id, thread_id, turn_messages, response_text)
    )

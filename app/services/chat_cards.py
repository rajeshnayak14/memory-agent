import re
from datetime import date as date_type, datetime
from typing import Literal

from pydantic import BaseModel

from app.tools.expense_tools import (
    _budget_spent,
    normalize_budget_action,
    resolve_budget_target,
    resolve_expense_breakdown,
    resolve_expense_daily_breakdown,
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


class DailyBreakdownDay(BaseModel):
    date: date_type
    items: list[ExpenseBreakdownItem]


class DailyBreakdownCard(BaseModel):
    type: Literal["daily_breakdown"] = "daily_breakdown"
    days: list[DailyBreakdownDay]
    totals: list[CurrencyTotal]


ChatCard = BudgetSummaryCard | ExpenseBreakdownCard | DailyBreakdownCard


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


def _last_tool_call_round(turn_messages: list) -> list:
    """The tool_calls list from the LAST AI message in this turn that made
    any tool calls at all — i.e. the round immediately preceding the
    turn's final text-only reply.

    A turn can call multiple different tools across several rounds before
    settling on an answer (e.g. get_expense_breakdown, then realizing the
    user actually asked for a date-wise view and calling
    get_expense_daily_breakdown instead). Only the LAST round is what the
    final answer is actually based on — searching the whole turn for any
    matching tool call, regardless of round, would let an earlier,
    superseded call attach the wrong card to a reply that has moved on.
    """
    last_round = []

    for message in turn_messages:
        if message.type == "ai" and getattr(message, "tool_calls", None):
            last_round = message.tool_calls

    return last_round


def _find_successful_tool_call(turn_messages: list, tool_name: str, predicate=None):
    """Find a call to `tool_name` in this turn's LAST round of tool calls
    whose result succeeded (see `_last_tool_call_round`). `predicate(args)`
    optionally filters further (e.g. only a budget_manager call whose
    action is "status")."""
    matched_call = None

    for tool_call in _last_tool_call_round(turn_messages):
        if tool_call["name"] != tool_name:
            continue

        if predicate and not predicate(tool_call["args"]):
            continue

        matched_call = tool_call  # last match in the round wins

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

# A standalone "**August 29, 2026**" / "August 29, 2026" line — how the
# model headers each day in a date-wise reply. get_expense_daily_
# breakdown's bullet lines are otherwise IDENTICAL in shape to a plain
# category breakdown's ("- category: amount" either way), so this header
# is the only reliable signal that a recited-from-memory reply (no fresh
# tool call this turn) is date-wise rather than a plain category list.
_DATE_HEADER_RE = re.compile(
    r"^\*{0,2}(?:January|February|March|April|May|June|July|August|"
    r"September|October|November|December) \d{1,2},? \d{4}\*{0,2}[ \t]*$",
    re.MULTILINE,
)


def _looks_like_daily_breakdown_text(text: str) -> bool:
    return bool(_DATE_HEADER_RE.search(text))


def _looks_like_expense_breakdown_text(text: str) -> bool:
    if _looks_like_daily_breakdown_text(text):
        return False

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
    # get_expense_daily_breakdown's output is bullet-shaped the same way
    # a category breakdown is ("- category: amount"), so the text-based
    # fallback below can't tell them apart by shape alone — if the last
    # round called the daily tool, this reply is date-wise, and no
    # category card belongs here regardless of what the text looks like
    # or whether an earlier, superseded round also called
    # get_expense_breakdown.
    if any(
        tool_call["name"] == "get_expense_daily_breakdown"
        for tool_call in _last_tool_call_round(turn_messages)
    ):
        return None

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


def find_daily_breakdown_card(
    db, user_id: int, thread_id: str, turn_messages: list, response_text: str,
) -> DailyBreakdownCard | None:
    """Resolve this turn's day-by-day breakdown into a structured card,
    either re-resolving a get_expense_daily_breakdown call made in this
    turn, or — if none was made but the reply still reads like one (has
    a date-header line) — falling back to the default (no date/period)
    breakdown so the card stays accurate regardless of what the model
    did.
    """
    daily_call = _find_successful_tool_call(turn_messages, "get_expense_daily_breakdown")

    if daily_call is not None:
        date_arg = daily_call["args"].get("date")
        period_arg = daily_call["args"].get("period")
    elif _looks_like_daily_breakdown_text(response_text):
        date_arg = None
        period_arg = None
    else:
        return None

    grouped, _, error = resolve_expense_daily_breakdown(
        db, user_id, thread_id, date_arg, period_arg,
    )

    if error or not grouped:
        return None

    days = []
    totals_by_currency: dict[str, float] = {}

    for day in sorted(grouped):
        categories = grouped[day]

        days.append(
            DailyBreakdownDay(
                date=day,
                items=[
                    ExpenseBreakdownItem(category=category, currency=currency, amount=amount)
                    for (category, currency), amount in sorted(categories.items())
                ],
            )
        )

        for (_category, currency), amount in categories.items():
            totals_by_currency[currency] = totals_by_currency.get(currency, 0.0) + amount

    return DailyBreakdownCard(
        days=days,
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
        or find_daily_breakdown_card(db, user_id, thread_id, turn_messages, response_text)
        or find_expense_breakdown_card(db, user_id, thread_id, turn_messages, response_text)
    )

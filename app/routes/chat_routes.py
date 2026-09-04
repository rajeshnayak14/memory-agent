import logging
import re
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.agent import agent
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import DatabaseError
from app.model import Conversation
from app.services.recurrence import materialize_due_recurrences
from app.tools.expense_tools import (
    _budget_spent,
    normalize_budget_action,
    resolve_budget_target,
    resolve_expense_breakdown,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])


class ChatRequest(BaseModel):
    thread_id: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=5000)


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


class ChatResponse(BaseModel):
    response: str
    card: BudgetSummaryCard | ExpenseBreakdownCard | None = None


def _find_successful_tool_call(
    messages: list,
    tool_name: str,
    predicate=None,
):
    """Find the last call to `tool_name` made in the CURRENT turn whose
    result succeeded — shared by every structured-card finder below.

    `messages` is the full checkpointed thread history (the checkpointer
    accumulates across every /chat call for this thread_id) — scoping to
    everything after the last HumanMessage keeps this to only the current
    turn's tool calls, so an earlier turn's tool call never reattaches
    itself to an unrelated later reply.

    `predicate(args)` optionally filters further (e.g. only a
    budget_manager call whose action is "status").

    Returns (tool_call, turn_messages) — tool_call is None if no matching
    successful call was found this turn.
    """
    last_human_idx = -1
    for i, message in enumerate(messages):
        if message.type == "human":
            last_human_idx = i

    turn_messages = messages[last_human_idx + 1:]

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
        return None, turn_messages

    tool_message = next(
        (
            m for m in turn_messages
            if m.type == "tool" and m.tool_call_id == matched_call["id"]
        ),
        None,
    )

    if tool_message is None or tool_message.status != "success":
        return None, turn_messages

    return matched_call, turn_messages


def _find_budget_summary_card(
    db: Session,
    user_id: int,
    thread_id: str,
    messages: list,
) -> BudgetSummaryCard | None:
    """Re-resolve a budget_manager(status) call made THIS turn into a
    structured card, if one was made."""
    status_call, _ = _find_successful_tool_call(
        messages,
        "budget_manager",
        predicate=lambda args: normalize_budget_action(args.get("action")) == "status",
    )

    if status_call is None:
        return None

    # Re-resolve the exact same target the tool call itself resolved —
    # this is safe to re-query here because every tool opens/commits its
    # own session, and materialize_due_recurrences already committed
    # before agent.invoke() was called, so everything this turn touched is
    # visible to this route's own session by the time invoke() returns.
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


def _find_expense_breakdown_card(
    db: Session,
    user_id: int,
    thread_id: str,
    messages: list,
    response_text: str,
) -> ExpenseBreakdownCard | None:
    """Resolve the current category breakdown into a structured card,
    either re-resolving a get_expense_breakdown call made THIS turn (the
    normal case), or — if none was made but the reply still reads like a
    breakdown — falling back to the default (no date/period) breakdown so
    the card stays accurate regardless of what the model did.
    """
    breakdown_call, _ = _find_successful_tool_call(messages, "get_expense_breakdown")

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


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(
        "Chat request received: user_id=%s thread_id=%s",
        user_id,
        request.thread_id,
    )

    try:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.user_id == int(user_id),
                Conversation.thread_id == request.thread_id,
            )
            .first()
        )

        if not conversation:
            conversation = Conversation(
                user_id=int(user_id),
                thread_id=request.thread_id,
                title=request.message[:200],
            )
            db.add(conversation)
        else:
            conversation.updated_at = datetime.now(timezone.utc)

        db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    materialize_due_recurrences(db, int(user_id))

    response = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": request.message,
                }
            ]
        },
        config={
            "configurable": {
                "user_id": user_id,
                "thread_id": request.thread_id,
            }
        },
    )

    content = ""

    for message in reversed(response["messages"]):
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

    content = str(content).strip()

    if not content:
        logger.warning(
            "Agent produced no text response: user_id=%s thread_id=%s",
            user_id,
            request.thread_id,
        )
        content = (
            "Sorry, I wasn't able to produce a response. "
            "Please try rephrasing that."
        )

    card = _find_budget_summary_card(
        db, int(user_id), request.thread_id, response["messages"],
    ) or _find_expense_breakdown_card(
        db, int(user_id), request.thread_id, response["messages"], content,
    )

    logger.info(
        "Chat response generated: user_id=%s thread_id=%s",
        user_id,
        request.thread_id,
    )

    return ChatResponse(response=content, card=card)
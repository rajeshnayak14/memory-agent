import logging
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


class ChatResponse(BaseModel):
    response: str
    card: BudgetSummaryCard | None = None


def _find_budget_summary_card(
    db: Session,
    user_id: int,
    thread_id: str,
    messages: list,
) -> BudgetSummaryCard | None:
    """Re-resolve a budget_manager(status) call made THIS turn into a
    structured card, if one was made.

    `messages` is the full checkpointed thread history (the checkpointer
    accumulates across every /chat call for this thread_id) — scoping to
    everything after the last HumanMessage keeps this to only the current
    turn's tool calls, so an earlier turn's budget check never reattaches
    itself to an unrelated later reply.
    """
    last_human_idx = -1
    for i, message in enumerate(messages):
        if message.type == "human":
            last_human_idx = i

    turn_messages = messages[last_human_idx + 1:]

    status_call = None

    for message in turn_messages:
        if message.type != "ai" or not getattr(message, "tool_calls", None):
            continue

        for tool_call in message.tool_calls:
            if tool_call["name"] != "budget_manager":
                continue

            if normalize_budget_action(tool_call["args"].get("action")) == "status":
                status_call = tool_call  # last match in the turn wins

    if status_call is None:
        return None

    tool_message = next(
        (
            m for m in turn_messages
            if m.type == "tool" and m.tool_call_id == status_call["id"]
        ),
        None,
    )

    if tool_message is None or tool_message.status != "success":
        return None

    # Re-resolve the exact same target the tool call itself resolved —
    # this is safe to re-query here because every tool opens/commits its
    # own session, and materialize_due_recurrences already committed
    # before agent.invoke() was called, so everything this turn touched is
    # visible to this route's own session by the time invoke() returns.
    target, *_ = resolve_budget_target(
        db,
        user_id,
        thread_id,
        status_call["args"].get("start_date"),
        status_call["args"].get("end_date"),
    )

    if target is None:
        return None

    spent = _budget_spent(db, user_id, thread_id, target)

    return BudgetSummaryCard(
        amount=target.amount,
        spent=spent,
        remaining=target.amount - spent,
        currency=target.currency,
        period_start=target.period_start,
        period_end=target.period_end,
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
    )

    logger.info(
        "Chat response generated: user_id=%s thread_id=%s",
        user_id,
        request.thread_id,
    )

    return ChatResponse(response=content, card=card)
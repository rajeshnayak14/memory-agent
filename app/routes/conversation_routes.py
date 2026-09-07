import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.agent_resources import checkpointer, store
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import DatabaseError
from app.model import (
    Conversation,
    Expense,
    Budget,
    RecurringExpense,
    RecurringBudget,
)
from app.schemas.conversation_schemas import (
    ConversationListResponse,
)
from app.services.chat_cards import (
    ChatCard,
    extract_final_reply_text,
    find_card_for_turn,
    segment_into_turns,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Conversations"],
)


class ChatHistoryMessage(BaseModel):
    role: str
    content: str
    card: ChatCard | None = None


class ChatHistoryResponse(BaseModel):
    thread_id: str
    messages: list[ChatHistoryMessage]


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
)
def get_conversations(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        conversations = (
            db.query(Conversation)
            .filter(
                Conversation.user_id == int(user_id)
            )
            .order_by(
                Conversation.updated_at.desc()
            )
            .all()
        )

    except SQLAlchemyError:
        raise DatabaseError(
            "Database operation failed"
        )

    logger.info(
        "Conversations retrieved: user_id=%s count=%s",
        user_id,
        len(conversations),
    )

    return {
        "conversations": conversations,
    }


@router.get(
    "/conversations/{thread_id}",
    response_model=ChatHistoryResponse,
)
def get_conversation(
    thread_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.user_id == int(user_id),
                Conversation.thread_id == thread_id,
            )
            .first()
        )

    except SQLAlchemyError:
        raise DatabaseError(
            "Database operation failed"
        )

    if not conversation:
        return {
            "thread_id": thread_id,
            "messages": [],
        }

    checkpoint = checkpointer.get_tuple(
        {
            "configurable": {
                "thread_id": thread_id,
            }
        }
    )

    if not checkpoint:
        return {
            "thread_id": thread_id,
            "messages": [],
        }

    channel_values = checkpoint.checkpoint.get(
        "channel_values",
        {}
    )

    raw_messages = channel_values.get(
        "messages",
        []
    )

    messages = []

    # Reconstructed per-turn rather than scanned once across the whole
    # thread: a structured card has to be resolved against the SAME
    # turn's own tool calls (or lack thereof) that produced it, otherwise
    # a card that appeared on the live response would silently vanish on
    # reload — which is exactly what a whole-thread, tool-call-agnostic
    # scan would do, since it has no notion of "which turn" a call
    # belongs to once everything's flattened into one list.
    for turn_messages in segment_into_turns(raw_messages):
        human_message = turn_messages[0]
        human_content = str(human_message.content).strip()

        if human_content:
            messages.append({
                "role": "user",
                "content": human_content,
            })

        reply_content = extract_final_reply_text(turn_messages)

        if not reply_content:
            continue

        card = find_card_for_turn(
            db, int(user_id), thread_id, turn_messages, reply_content,
        )

        messages.append({
            "role": "assistant",
            "content": reply_content,
            "card": card,
        })

    logger.info(
        "Conversation history retrieved: "
        "user_id=%s thread_id=%s messages=%s",
        user_id,
        thread_id,
        len(messages),
    )

    return {
        "thread_id": thread_id,
        "messages": messages,
    }


@router.delete("/conversations/{thread_id}")
def delete_conversation(
    thread_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user_id_int = int(user_id)

        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.user_id == user_id_int,
                Conversation.thread_id == thread_id,
            )
            .first()
        )

        if not conversation:
            return {
                "message": "Conversation not found."
            }

        # Delete LangGraph conversation/checkpoint
        checkpointer.delete_thread(thread_id)

        # Delete thread-specific expenses
        db.query(Expense).filter(
            Expense.user_id == user_id_int,
            Expense.thread_id == thread_id,
        ).delete(
            synchronize_session=False
        )

        # Delete thread-specific budgets
        db.query(Budget).filter(
            Budget.user_id == user_id_int,
            Budget.thread_id == thread_id,
        ).delete(
            synchronize_session=False
        )

        # Delete thread-specific recurring rules — otherwise a rule
        # outlives its thread and keeps materializing Expense/Budget rows
        # into a thread_id with no Conversation row behind it.
        db.query(RecurringExpense).filter(
            RecurringExpense.user_id == user_id_int,
            RecurringExpense.thread_id == thread_id,
        ).delete(
            synchronize_session=False
        )

        db.query(RecurringBudget).filter(
            RecurringBudget.user_id == user_id_int,
            RecurringBudget.thread_id == thread_id,
        ).delete(
            synchronize_session=False
        )

        # Delete conversation metadata
        db.delete(conversation)

        db.commit()

        logger.info(
            "Conversation and thread data deleted: "
            "user_id=%s thread_id=%s",
            user_id_int,
            thread_id,
        )

        return {
            "message": (
                "Conversation and all thread data "
                "deleted successfully."
            )
        }

    except SQLAlchemyError:
        db.rollback()

        raise DatabaseError(
            "Database operation failed"
        )
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.agent import agent
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import DatabaseError
from app.model import Conversation
from app.services.chat_cards import (
    ChatCard,
    extract_final_reply_text,
    find_card_for_turn,
    segment_into_turns,
)
from app.services.memory_analyzer import MemorySuggestion, analyze_for_memory_suggestion
from app.services.recurrence import materialize_due_recurrences

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])


class ChatRequest(BaseModel):
    thread_id: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=5000)


class ChatResponse(BaseModel):
    response: str
    card: ChatCard | None = None
    memory_suggestion: MemorySuggestion | None = None


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

    turns = segment_into_turns(response["messages"])
    current_turn = turns[-1] if turns else []

    content = extract_final_reply_text(current_turn)

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

    card = find_card_for_turn(db, int(user_id), request.thread_id, current_turn, content)

    # ~2-3 turns of context before the current one, as plain user/assistant
    # text pairs — deliberately NOT the raw LangGraph message objects, so
    # the memory analyzer stays a standalone module with no dependency on
    # agent internals. Run AFTER agent.invoke() so that if the user just
    # explicitly said "remember that..." (handled entirely by the existing
    # manage_memory tool, above), that memory is already saved and shows up
    # in the analyzer's own existing-memories lookup below — which is what
    # stops it from suggesting the exact same thing a second time.
    previous_turns = [
        {
            "user": str(turn_messages[0].content).strip(),
            "assistant": extract_final_reply_text(turn_messages),
        }
        for turn_messages in turns[:-1][-3:]
    ]

    memory_suggestion = analyze_for_memory_suggestion(
        user_id=user_id,
        previous_turns=previous_turns,
        current_message=request.message,
        current_reply=content,
    )

    logger.info(
        "Chat response generated: user_id=%s thread_id=%s",
        user_id,
        request.thread_id,
    )

    return ChatResponse(response=content, card=card, memory_suggestion=memory_suggestion)

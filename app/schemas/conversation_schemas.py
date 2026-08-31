from datetime import datetime

from pydantic import BaseModel


class ConversationResponse(BaseModel):
    thread_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]
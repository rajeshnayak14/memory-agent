from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    budget_id: int | None
    type: str
    title: str
    body: str
    read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]


class UnreadCountResponse(BaseModel):
    count: int

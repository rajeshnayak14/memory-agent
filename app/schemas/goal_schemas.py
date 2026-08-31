from datetime import datetime

from pydantic import BaseModel, Field


class GoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    currency: str
    target_date: datetime | None
    created_at: datetime


class GoalCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    target_amount: float = Field(gt=0)
    currency: str | None = None
    target_date: str | None = None


class GoalUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    target_amount: float | None = Field(default=None, gt=0)
    currency: str | None = None
    target_date: str | None = None


class GoalContributeRequest(BaseModel):
    amount: float


class GoalListResponse(BaseModel):
    goals: list[GoalResponse]

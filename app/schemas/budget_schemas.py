from datetime import datetime

from pydantic import BaseModel, Field


class BudgetResponse(BaseModel):
    id: int
    thread_id: str
    amount: float
    currency: str
    period_start: datetime
    period_end: datetime
    spent: float
    remaining: float
    used_pct: float


class BudgetCreateRequest(BaseModel):
    thread_id: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    start_date: str
    end_date: str
    currency: str | None = None


class BudgetUpdateRequest(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    currency: str | None = None
    start_date: str | None = None
    end_date: str | None = None


class BudgetListResponse(BaseModel):
    budgets: list[BudgetResponse]

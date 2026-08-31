from datetime import date, datetime

from pydantic import BaseModel, Field


class ExpenseResponse(BaseModel):
    id: int
    thread_id: str
    amount: float
    currency: str
    category: str
    description: str
    expense_date: datetime
    created_at: datetime


class ExpenseCreateRequest(BaseModel):
    thread_id: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=500)
    date: str = "today"
    currency: str | None = None


class ExpenseUpdateRequest(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    date: str | None = None
    currency: str | None = None


class ExpenseListResponse(BaseModel):
    expenses: list[ExpenseResponse]


class CategoryAmount(BaseModel):
    category: str
    currency: str
    amount: float


class ExpenseBreakdownResponse(BaseModel):
    breakdown: list[CategoryAmount]


class DailyCategoryAmount(BaseModel):
    date: date
    category: str
    currency: str
    amount: float


class ExpenseDailyBreakdownResponse(BaseModel):
    daily: list[DailyCategoryAmount]

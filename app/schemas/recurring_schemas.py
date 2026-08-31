from datetime import datetime

from pydantic import BaseModel, Field


class RecurringExpenseResponse(BaseModel):
    id: int
    thread_id: str
    amount: float
    currency: str
    category: str
    description: str
    frequency: str
    next_run_date: datetime
    active: bool
    created_at: datetime


class RecurringExpenseCreateRequest(BaseModel):
    thread_id: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=500)
    frequency: str
    start_date: str = "today"
    currency: str | None = None


class RecurringExpenseUpdateRequest(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    frequency: str | None = None
    currency: str | None = None
    active: bool | None = None


class RecurringExpenseListResponse(BaseModel):
    recurring_expenses: list[RecurringExpenseResponse]


class RecurringBudgetResponse(BaseModel):
    id: int
    thread_id: str
    amount: float
    currency: str
    frequency: str
    next_period_start: datetime
    active: bool
    created_at: datetime


class RecurringBudgetCreateRequest(BaseModel):
    thread_id: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    frequency: str
    start_date: str = "today"
    currency: str | None = None


class RecurringBudgetUpdateRequest(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    frequency: str | None = None
    currency: str | None = None
    active: bool | None = None


class RecurringBudgetListResponse(BaseModel):
    recurring_budgets: list[RecurringBudgetResponse]

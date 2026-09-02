from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.validators import validate_password_strength


class AdminUserCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    is_admin: bool = False
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class AdminUserListItem(BaseModel):
    id: int
    username: str
    email: str | None
    is_active: bool
    is_admin: bool
    created_at: datetime


class AdminUserListResponse(BaseModel):
    users: list[AdminUserListItem]


class SpendTotal(BaseModel):
    currency: str
    amount: float


class AdminUserDetailResponse(BaseModel):
    id: int
    username: str
    email: str | None
    is_active: bool
    is_admin: bool
    preferred_currency: str
    created_at: datetime
    expense_count: int
    budget_count: int
    goal_count: int
    category_count: int
    conversation_count: int
    total_spent: list[SpendTotal]


class AdminUserUpdateRequest(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminStatsResponse(BaseModel):
    total_users: int
    total_admins: int
    active_users: int
    total_expenses: int
    total_budgets: int
    total_goals: int

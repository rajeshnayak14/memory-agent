from datetime import datetime

from pydantic import BaseModel, field_validator

from app.currency import CURRENCY_SYMBOLS


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    is_active: bool
    is_admin: bool
    email_verified: bool
    preferred_currency: str
    created_at: datetime


class UserUpdateRequest(BaseModel):
    preferred_currency: str

    @field_validator("preferred_currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        code = value.strip().upper()

        if code not in CURRENCY_SYMBOLS:
            allowed = ", ".join(sorted(CURRENCY_SYMBOLS))
            raise ValueError(f"currency must be one of: {allowed}")

        return code
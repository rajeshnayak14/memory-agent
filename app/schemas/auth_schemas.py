from pydantic import BaseModel, EmailStr, Field, field_validator

from app.validators import validate_password_strength


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class LoginResponse(BaseModel):
    verification_required: bool = False
    verification_token: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None


class VerifyEmailRequest(BaseModel):
    verification_token: str
    code: str = Field(min_length=6, max_length=6)


class ResendVerificationRequest(BaseModel):
    verification_token: str


class MessageResponse(BaseModel):
    message: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str


class RegisterResponse(BaseModel):
    message: str
    user_id: str
    username: str
    verification_token: str


class LogoutResponse(BaseModel):
    message: str
    user_id: str


class GoogleSignInRequest(BaseModel):
    credential: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)

from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class LoginResponse(BaseModel):
    mfa_required: bool = False
    mfa_token: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None


class VerifyOtpRequest(BaseModel):
    mfa_token: str
    code: str = Field(min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    mfa_token: str


class MessageResponse(BaseModel):
    message: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str


class RegisterResponse(BaseModel):
    message: str
    user_id: str
    username: str


class LogoutResponse(BaseModel):
    message: str
    user_id: str
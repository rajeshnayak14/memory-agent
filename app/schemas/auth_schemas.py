from pydantic import BaseModel, Field


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

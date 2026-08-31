from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


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
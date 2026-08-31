from fastapi import Depends

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.auth import verify_token
from app.exceptions import AuthenticationError


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        return verify_token(
            credentials.credentials,
            token_type="access",
        )

    except Exception:
        raise AuthenticationError(
            "Invalid or expired token"
        )
from fastapi import Depends, HTTPException

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.orm import Session

from app.auth import verify_token
from app.database import get_db
from app.exceptions import AuthenticationError
from app.model import User


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


def get_current_admin(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Same identity check as get_current_user, plus an is_admin check.

    Authenticated-but-not-admin is a 403 (a different failure mode than an
    invalid/expired token, which is 401 via AuthenticationError), so this
    raises HTTPException directly rather than reusing that exception.
    """
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user or not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return user_id
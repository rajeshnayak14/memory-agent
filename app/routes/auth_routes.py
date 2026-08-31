import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import jwt

from app.auth import (
    SECRET_KEY,
    ALGORITHM,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.database import get_db
from app.model import User
from app.token_service import (
    revoke_refresh_token,
    is_token_revoked,
)
from app.exceptions import (
    AuthenticationError,
    DatabaseError,
)
from app.schemas.auth_schemas import (
    TokenResponse,
    AccessTokenResponse,
    RegisterResponse,
    LogoutResponse,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Authentication"],
)

password_hasher = PasswordHasher()


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=3, max_length=100)


@router.post("/register", response_model=RegisterResponse)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        existing_user = (
            db.query(User)
            .filter(
                (User.username == request.username)
                | (User.email == request.email)
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Username or email already exists",
            )

        user = User(
            username=request.username,
            email=request.email,
            password_hash=password_hasher.hash(request.password),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    logger.info(
        "User registered successfully: user_id=%s",
        user.id,
    )

    return {
        "message": "User registered successfully",
        "user_id": str(user.id),
        "username": user.username,
    }


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    try:
        user = (
            db.query(User)
            .filter(
                (User.username == form_data.username)
                | (User.email == form_data.username)
            )
            .first()
        )

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    if not user:
        logger.warning(
            "Login failed: invalid credentials for username=%s",
            form_data.username,
        )
        raise AuthenticationError(
            "Invalid username or password"
        )

    try:
        password_hasher.verify(
            user.password_hash,
            form_data.password,
        )
    except VerifyMismatchError:
        logger.warning(
            "Login failed: invalid credentials for username=%s",
            form_data.username,
        )
        raise AuthenticationError(
            "Invalid username or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive",
        )

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    logger.info(
        "User login successful: user_id=%s",
        user.id,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    refresh_token: str,
    db: Session = Depends(get_db),
):
    try:
        if is_token_revoked(db, refresh_token):
            raise AuthenticationError(
                "Refresh token has been revoked"
            )

        user_id = verify_token(
            refresh_token,
            token_type="refresh",
        )

        access_token = create_access_token(user_id)

        return {
            "access_token": access_token,
            "token_type": "bearer",
        }

    except AuthenticationError:
        raise

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    except Exception:
        raise AuthenticationError(
            "Invalid or expired refresh token"
        )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    refresh_token: str,
    db: Session = Depends(get_db),
):
    try:
        user_id = verify_token(
            refresh_token,
            token_type="refresh",
        )

        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        expires_at = datetime.fromtimestamp(
            payload["exp"],
            tz=timezone.utc,
        )

    except Exception:
        raise AuthenticationError(
            "Invalid or expired refresh token"
        )

    try:
        revoke_refresh_token(
            db,
            refresh_token,
            expires_at,
        )

    except SQLAlchemyError:
        raise DatabaseError(
            "Database operation failed"
        )

    logger.info(
        "User logout successful: user_id=%s",
        user_id,
    )

    return {
        "message": "Logged out successfully",
        "user_id": user_id,
    }
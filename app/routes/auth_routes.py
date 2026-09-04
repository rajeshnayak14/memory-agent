import logging
import os
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, EmailStr, Field, field_validator
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
    create_verification_token,
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
    EmailDeliveryError,
)
from app.schemas.auth_schemas import (
    TokenResponse,
    AccessTokenResponse,
    RegisterResponse,
    LogoutResponse,
    LoginResponse,
    VerifyEmailRequest,
    ResendVerificationRequest,
    MessageResponse,
    GoogleSignInRequest,
)
from app.services.otp import OtpCooldownError, create_and_send_otp, verify_otp_code
from app.validators import validate_password_strength


logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Authentication"],
)

password_hasher = PasswordHasher()


def _promote_if_designated_admin(user: User, db: Session) -> None:
    """Grant is_admin the first time a designated email registers or logs
    in — set via the ADMIN_EMAILS env var (comma-separated), so a fresh
    deploy never needs a manual DB edit to get its first admin. Safe to
    call on every login: it's a no-op once already granted, and only ever
    promotes, never demotes (removing an email from the env var doesn't
    revoke access — do that from the admin panel itself).
    """
    designated = {
        email.strip().lower()
        for email in os.getenv("ADMIN_EMAILS", "").split(",")
        if email.strip()
    }

    if user.email and user.email.lower() in designated and not user.is_admin:
        user.is_admin = True
        db.commit()


def _unique_username_from_email(db: Session, email: str) -> str:
    """Derive a username for a Google-created account from the email's
    local part, appending a counter if that base is already taken."""
    base = email.split("@")[0][:90] or "user"
    candidate = base
    suffix = 1

    while db.query(User).filter(User.username == candidate).first():
        suffix += 1
        candidate = f"{base}{suffix}"

    return candidate


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


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

        _promote_if_designated_admin(user, db)

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    try:
        create_and_send_otp(db, user)
    except OtpCooldownError:
        pass
    except Exception as err:
        raise EmailDeliveryError(str(err))

    logger.info(
        "User registered successfully, verification sent: user_id=%s",
        user.id,
    )

    return {
        "message": "Account created. Check your email for a verification code.",
        "user_id": str(user.id),
        "username": user.username,
        "verification_token": create_verification_token(str(user.id)),
    }


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(
    request: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    try:
        user_id = verify_token(request.verification_token, token_type="email_verification")
    except Exception:
        raise AuthenticationError("Invalid or expired verification session")

    if not verify_otp_code(db, int(user_id), code=request.code):
        raise AuthenticationError("Invalid or expired code")

    try:
        user = db.query(User).filter(User.id == int(user_id)).first()

        if not user:
            raise AuthenticationError("Invalid or expired verification session")

        user.email_verified = True
        db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    logger.info("Email verified, user logged in: user_id=%s", user_id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/verify-email/resend", response_model=MessageResponse)
def resend_verification(
    request: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    try:
        user_id = verify_token(request.verification_token, token_type="email_verification")
    except Exception:
        raise AuthenticationError("Invalid or expired verification session")

    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    if not user:
        raise AuthenticationError("Invalid or expired verification session")

    try:
        create_and_send_otp(db, user)
    except OtpCooldownError as err:
        raise HTTPException(status_code=429, detail=str(err))
    except Exception as err:
        raise EmailDeliveryError(str(err))

    return {"message": "A new code has been sent."}


@router.post("/login", response_model=LoginResponse)
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

    _promote_if_designated_admin(user, db)

    # Verification is a one-time gate, not a per-login challenge: an
    # account that never completed it stays blocked until it does, but
    # a verified account logs straight in with just a password, every
    # time. An account with no email (only possible for pre-existing
    # rows from before email was required) has no gate to pass.
    if user.email and not user.email_verified:
        try:
            create_and_send_otp(db, user)
        except OtpCooldownError:
            pass
        except Exception as err:
            raise EmailDeliveryError(str(err))

        logger.info(
            "Login blocked pending email verification: user_id=%s",
            user.id,
        )

        return {
            "verification_required": True,
            "verification_token": create_verification_token(str(user.id)),
        }

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


@router.post("/auth/google", response_model=TokenResponse)
def google_signin(
    request: GoogleSignInRequest,
    db: Session = Depends(get_db),
):
    client_id = os.getenv("GOOGLE_CLIENT_ID")

    if not client_id:
        raise AuthenticationError("Google sign-in is not configured")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            request.credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError:
        raise AuthenticationError("Invalid Google credential")

    email = idinfo.get("email")

    if not email or not idinfo.get("email_verified"):
        raise AuthenticationError("Google account email is not verified")

    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            user = User(
                username=_unique_username_from_email(db, email),
                email=email,
                # Random, never used to log in — this account only ever
                # authenticates via Google.
                password_hash=password_hasher.hash(secrets.token_urlsafe(32)),
                email_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not user.email_verified:
            # Google already proves ownership of this email, satisfying
            # the same verification gate a password account has to pass.
            user.email_verified = True
            db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive",
        )

    _promote_if_designated_admin(user, db)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    logger.info("Google sign-in successful: user_id=%s", user.id)

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

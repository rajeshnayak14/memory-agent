import logging

from fastapi import APIRouter, Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import (
    DatabaseError,
    UserNotFoundError,
)
from app.model import User
from app.schemas.user_schemas import UserResponse, UserUpdateRequest


logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Users"],
)


@router.get("/me", response_model=UserResponse)
def get_me(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user = (
            db.query(User)
            .filter(User.id == int(user_id))
            .first()
        )

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    if not user:
        raise UserNotFoundError("User not found")

    logger.info(
        "User profile retrieved: user_id=%s",
        user_id,
    )

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "preferred_currency": user.preferred_currency,
        "created_at": user.created_at,
    }


@router.put("/me", response_model=UserResponse)
def update_me(
    request: UserUpdateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user = (
            db.query(User)
            .filter(User.id == int(user_id))
            .first()
        )

        if not user:
            raise UserNotFoundError("User not found")

        user.preferred_currency = request.preferred_currency

        db.commit()
        db.refresh(user)

    except UserNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    logger.info(
        "User profile updated: user_id=%s",
        user_id,
    )

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "preferred_currency": user.preferred_currency,
        "created_at": user.created_at,
    }

import logging

from argon2 import PasswordHasher
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.exceptions import DatabaseError, ResourceNotFoundError
from app.model import Budget, Category, Conversation, Expense, Goal, User
from app.schemas.admin_schemas import (
    AdminStatsResponse,
    AdminUserCreateRequest,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminUserUpdateRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

password_hasher = PasswordHasher()


@router.post("/users", response_model=AdminUserDetailResponse, status_code=201)
def create_user(
    request: AdminUserCreateRequest,
    admin_user_id: str = Depends(get_current_admin),
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
            is_admin=request.is_admin,
            is_active=request.is_active,
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
        "Admin created user: admin_id=%s new_user_id=%s",
        admin_user_id, user.id,
    )

    return get_user_detail(user.id, admin_user_id, db)


@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    q: str | None = None,
    admin_user_id: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        query = db.query(User)

        if q:
            like = f"%{q}%"
            query = query.filter(
                (User.username.ilike(like)) | (User.email.ilike(like))
            )

        users = query.order_by(User.created_at.desc()).all()

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"users": users}


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(
    admin_user_id: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        return {
            "total_users": db.query(User).count(),
            "total_admins": db.query(User).filter(User.is_admin.is_(True)).count(),
            "active_users": db.query(User).filter(User.is_active.is_(True)).count(),
            "total_expenses": db.query(Expense).count(),
            "total_budgets": db.query(Budget).count(),
            "total_goals": db.query(Goal).count(),
        }

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
def get_user_detail(
    user_id: int,
    admin_user_id: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise ResourceNotFoundError("User not found")

        expenses = db.query(Expense).filter(Expense.user_id == user_id).all()

        totals = {}
        for expense in expenses:
            totals[expense.currency] = totals.get(expense.currency, 0.0) + expense.amount

        total_spent = [
            {"currency": currency, "amount": amount}
            for currency, amount in sorted(totals.items())
        ]

        detail = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "preferred_currency": user.preferred_currency,
            "created_at": user.created_at,
            "expense_count": len(expenses),
            "budget_count": db.query(Budget).filter(Budget.user_id == user_id).count(),
            "goal_count": db.query(Goal).filter(Goal.user_id == user_id).count(),
            "category_count": db.query(Category).filter(Category.user_id == user_id).count(),
            "conversation_count": db.query(Conversation).filter(Conversation.user_id == user_id).count(),
            "total_spent": total_spent,
        }

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return detail


@router.put("/users/{user_id}", response_model=AdminUserDetailResponse)
def update_user(
    user_id: int,
    request: AdminUserUpdateRequest,
    admin_user_id: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == int(admin_user_id):
        if request.is_admin is False or request.is_active is False:
            raise HTTPException(
                status_code=400,
                detail="You can't revoke your own admin access or deactivate your own account.",
            )

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise ResourceNotFoundError("User not found")

        if request.is_active is not None:
            user.is_active = request.is_active

        if request.is_admin is not None:
            user.is_admin = request.is_admin

        db.commit()
        db.refresh(user)

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    logger.info(
        "Admin updated user: admin_id=%s target_user_id=%s is_active=%s is_admin=%s",
        admin_user_id, user_id, user.is_active, user.is_admin,
    )

    return get_user_detail(user_id, admin_user_id, db)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin_user_id: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == int(admin_user_id):
        raise HTTPException(
            status_code=400,
            detail="You can't delete your own account from the admin panel.",
        )

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise ResourceNotFoundError("User not found")

        db.delete(user)
        db.commit()

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    logger.info(
        "Admin deleted user: admin_id=%s target_user_id=%s",
        admin_user_id, user_id,
    )

    return {"message": "User deleted"}

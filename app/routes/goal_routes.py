import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.currency import normalize_currency
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import DatabaseError, ResourceNotFoundError
from app.model import Goal
from app.schemas.goal_schemas import (
    GoalContributeRequest,
    GoalCreateRequest,
    GoalListResponse,
    GoalResponse,
    GoalUpdateRequest,
)
from app.tools.expense_tools import get_user_currency, resolve_date, to_datetime_start

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("", response_model=GoalListResponse)
def list_goals(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        goals = (
            db.query(Goal)
            .filter(Goal.user_id == int(user_id))
            .order_by(Goal.created_at.desc())
            .all()
        )

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"goals": goals}


@router.post("", response_model=GoalResponse)
def create_goal(
    request: GoalCreateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    target_date = None
    if request.target_date:
        resolved = resolve_date(request.target_date)
        if not resolved:
            raise HTTPException(status_code=422, detail="Invalid target_date.")
        target_date = to_datetime_start(resolved)

    try:
        goal = Goal(
            user_id=user_id_int,
            name=request.name,
            target_amount=request.target_amount,
            current_amount=0,
            currency=normalize_currency(
                request.currency, get_user_currency(db, user_id_int)
            ),
            target_date=target_date,
        )

        db.add(goal)
        db.commit()
        db.refresh(goal)

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    request: GoalUpdateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        goal = (
            db.query(Goal)
            .filter(Goal.id == goal_id, Goal.user_id == user_id_int)
            .first()
        )

        if not goal:
            raise ResourceNotFoundError("Goal not found")

        if request.name is not None:
            goal.name = request.name

        if request.target_amount is not None:
            goal.target_amount = request.target_amount

        if request.currency is not None:
            goal.currency = normalize_currency(request.currency, goal.currency)

        if request.target_date is not None:
            resolved = resolve_date(request.target_date)
            if not resolved:
                raise HTTPException(status_code=422, detail="Invalid target_date.")
            goal.target_date = to_datetime_start(resolved)

        db.commit()
        db.refresh(goal)

    except (ResourceNotFoundError, HTTPException):
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return goal


@router.post("/{goal_id}/contribute", response_model=GoalResponse)
def contribute_to_goal(
    goal_id: int,
    request: GoalContributeRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        goal = (
            db.query(Goal)
            .filter(Goal.id == goal_id, Goal.user_id == int(user_id))
            .first()
        )

        if not goal:
            raise ResourceNotFoundError("Goal not found")

        goal.current_amount = max(0.0, goal.current_amount + request.amount)

        db.commit()
        db.refresh(goal)

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return goal


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        goal = (
            db.query(Goal)
            .filter(Goal.id == goal_id, Goal.user_id == int(user_id))
            .first()
        )

        if not goal:
            raise ResourceNotFoundError("Goal not found")

        db.delete(goal)
        db.commit()

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return {"message": "Goal deleted"}

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.currency import normalize_currency
from app.exceptions import DatabaseError, ResourceNotFoundError
from app.model import Budget
from app.schemas.budget_schemas import (
    BudgetCreateRequest,
    BudgetListResponse,
    BudgetResponse,
    BudgetUpdateRequest,
)
from app.services.recurrence import materialize_due_recurrences
from app.tools.expense_tools import (
    _budget_spent,
    get_user_currency,
    resolve_date,
    to_datetime_start,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Budgets"])


def _to_response(db: Session, user_id: int, budget: Budget) -> dict:
    spent = _budget_spent(db, user_id, budget.thread_id, budget)
    remaining = float(budget.amount) - spent
    used_pct = (spent / float(budget.amount) * 100) if budget.amount else 0.0

    return {
        "id": budget.id,
        "thread_id": budget.thread_id,
        "amount": budget.amount,
        "currency": budget.currency,
        "period_start": budget.period_start,
        "period_end": budget.period_end,
        "spent": spent,
        "remaining": remaining,
        "used_pct": used_pct,
    }


@router.get("/budgets", response_model=BudgetListResponse)
def list_budgets(
    thread_id: str | None = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    materialize_due_recurrences(db, user_id_int)

    try:
        query = db.query(Budget).filter(Budget.user_id == user_id_int)

        if thread_id is not None:
            query = query.filter(Budget.thread_id == thread_id)

        budgets = (
            query
            .order_by(Budget.period_start.desc(), Budget.id.desc())
            .all()
        )

        response = [_to_response(db, user_id_int, b) for b in budgets]

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"budgets": response}


@router.post("/budgets", response_model=BudgetResponse)
def create_budget(
    request: BudgetCreateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    start = resolve_date(request.start_date)
    end_inclusive = resolve_date(request.end_date)

    if not start or not end_inclusive or end_inclusive < start:
        raise HTTPException(status_code=422, detail="Invalid budget date range.")

    end = end_inclusive + timedelta(days=1)

    try:
        budget = Budget(
            user_id=user_id_int,
            thread_id=request.thread_id,
            amount=request.amount,
            currency=normalize_currency(
                request.currency, get_user_currency(db, user_id_int)
            ),
            period_start=to_datetime_start(start),
            period_end=to_datetime_start(end),
        )

        db.add(budget)
        db.commit()
        db.refresh(budget)

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    logger.info(
        "Budget created via REST: user_id=%s budget_id=%s",
        user_id, budget.id,
    )

    return _to_response(db, user_id_int, budget)


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    request: BudgetUpdateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        budget = (
            db.query(Budget)
            .filter(Budget.id == budget_id, Budget.user_id == user_id_int)
            .first()
        )

        if not budget:
            raise ResourceNotFoundError("Budget not found")

        if request.amount is not None:
            budget.amount = request.amount

        if request.currency is not None:
            budget.currency = normalize_currency(request.currency, budget.currency)

        if request.start_date is not None or request.end_date is not None:
            if not request.start_date or not request.end_date:
                raise HTTPException(
                    status_code=422,
                    detail="Provide both start_date and end_date.",
                )

            start = resolve_date(request.start_date)
            end_inclusive = resolve_date(request.end_date)

            if not start or not end_inclusive or end_inclusive < start:
                raise HTTPException(
                    status_code=422, detail="Invalid budget date range.",
                )

            budget.period_start = to_datetime_start(start)
            budget.period_end = to_datetime_start(end_inclusive + timedelta(days=1))

        db.commit()
        db.refresh(budget)

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return _to_response(db, user_id_int, budget)


@router.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        budget = (
            db.query(Budget)
            .filter(Budget.id == budget_id, Budget.user_id == user_id_int)
            .first()
        )

        if not budget:
            raise ResourceNotFoundError("Budget not found")

        db.delete(budget)
        db.commit()

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return {"message": "Budget deleted"}

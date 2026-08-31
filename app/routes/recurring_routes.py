import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.currency import normalize_currency
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import DatabaseError, ResourceNotFoundError
from app.model import RecurringBudget, RecurringExpense
from app.schemas.recurring_schemas import (
    RecurringBudgetCreateRequest,
    RecurringBudgetListResponse,
    RecurringBudgetResponse,
    RecurringBudgetUpdateRequest,
    RecurringExpenseCreateRequest,
    RecurringExpenseListResponse,
    RecurringExpenseResponse,
    RecurringExpenseUpdateRequest,
)
from app.services.recurrence import materialize_due_recurrences
from app.tools.expense_tools import (
    get_user_currency,
    resolve_date,
    to_datetime_start,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recurring", tags=["Recurring"])

VALID_EXPENSE_FREQUENCIES = {"daily", "weekly", "monthly"}
VALID_BUDGET_FREQUENCIES = {"weekly", "monthly"}


# ============================================================
# RECURRING EXPENSES
# ============================================================

@router.get("/expenses", response_model=RecurringExpenseListResponse)
def list_recurring_expenses(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    materialize_due_recurrences(db, user_id_int)

    try:
        rules = (
            db.query(RecurringExpense)
            .filter(RecurringExpense.user_id == user_id_int)
            .order_by(RecurringExpense.created_at.desc())
            .all()
        )

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"recurring_expenses": rules}


@router.post("/expenses", response_model=RecurringExpenseResponse)
def create_recurring_expense(
    request: RecurringExpenseCreateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    freq = request.frequency.strip().lower()

    if freq not in VALID_EXPENSE_FREQUENCIES:
        raise HTTPException(
            status_code=422,
            detail="frequency must be 'daily', 'weekly', or 'monthly'.",
        )

    start = resolve_date(request.start_date)

    if not start:
        raise HTTPException(status_code=422, detail="Invalid start_date.")

    try:
        rule = RecurringExpense(
            user_id=user_id_int,
            thread_id=request.thread_id,
            amount=request.amount,
            category=request.category,
            description=request.description,
            currency=normalize_currency(
                request.currency, get_user_currency(db, user_id_int)
            ),
            frequency=freq,
            next_run_date=to_datetime_start(start),
            active=True,
        )

        db.add(rule)
        db.commit()
        db.refresh(rule)

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return rule


@router.put("/expenses/{recurring_id}", response_model=RecurringExpenseResponse)
def update_recurring_expense(
    recurring_id: int,
    request: RecurringExpenseUpdateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        rule = (
            db.query(RecurringExpense)
            .filter(
                RecurringExpense.id == recurring_id,
                RecurringExpense.user_id == user_id_int,
            )
            .first()
        )

        if not rule:
            raise ResourceNotFoundError("Recurring expense not found")

        if request.amount is not None:
            rule.amount = request.amount

        if request.category is not None:
            rule.category = request.category

        if request.description is not None:
            rule.description = request.description

        if request.frequency is not None:
            freq = request.frequency.strip().lower()

            if freq not in VALID_EXPENSE_FREQUENCIES:
                raise HTTPException(
                    status_code=422,
                    detail="frequency must be 'daily', 'weekly', or 'monthly'.",
                )

            rule.frequency = freq

        if request.currency is not None:
            rule.currency = normalize_currency(request.currency, rule.currency)

        if request.active is not None:
            rule.active = request.active

        db.commit()
        db.refresh(rule)

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return rule


@router.delete("/expenses/{recurring_id}")
def delete_recurring_expense(
    recurring_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        rule = (
            db.query(RecurringExpense)
            .filter(
                RecurringExpense.id == recurring_id,
                RecurringExpense.user_id == user_id_int,
            )
            .first()
        )

        if not rule:
            raise ResourceNotFoundError("Recurring expense not found")

        db.delete(rule)
        db.commit()

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return {"message": "Recurring expense deleted"}


# ============================================================
# RECURRING BUDGETS
# ============================================================

@router.get("/budgets", response_model=RecurringBudgetListResponse)
def list_recurring_budgets(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    materialize_due_recurrences(db, user_id_int)

    try:
        rules = (
            db.query(RecurringBudget)
            .filter(RecurringBudget.user_id == user_id_int)
            .order_by(RecurringBudget.created_at.desc())
            .all()
        )

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"recurring_budgets": rules}


@router.post("/budgets", response_model=RecurringBudgetResponse)
def create_recurring_budget(
    request: RecurringBudgetCreateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    freq = request.frequency.strip().lower()

    if freq not in VALID_BUDGET_FREQUENCIES:
        raise HTTPException(
            status_code=422,
            detail="frequency must be 'weekly' or 'monthly'.",
        )

    start = resolve_date(request.start_date)

    if not start:
        raise HTTPException(status_code=422, detail="Invalid start_date.")

    try:
        rule = RecurringBudget(
            user_id=user_id_int,
            thread_id=request.thread_id,
            amount=request.amount,
            currency=normalize_currency(
                request.currency, get_user_currency(db, user_id_int)
            ),
            frequency=freq,
            next_period_start=to_datetime_start(start),
            active=True,
        )

        db.add(rule)
        db.commit()
        db.refresh(rule)

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return rule


@router.put("/budgets/{recurring_id}", response_model=RecurringBudgetResponse)
def update_recurring_budget(
    recurring_id: int,
    request: RecurringBudgetUpdateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        rule = (
            db.query(RecurringBudget)
            .filter(
                RecurringBudget.id == recurring_id,
                RecurringBudget.user_id == user_id_int,
            )
            .first()
        )

        if not rule:
            raise ResourceNotFoundError("Recurring budget not found")

        if request.amount is not None:
            rule.amount = request.amount

        if request.frequency is not None:
            freq = request.frequency.strip().lower()

            if freq not in VALID_BUDGET_FREQUENCIES:
                raise HTTPException(
                    status_code=422,
                    detail="frequency must be 'weekly' or 'monthly'.",
                )

            rule.frequency = freq

        if request.currency is not None:
            rule.currency = normalize_currency(request.currency, rule.currency)

        if request.active is not None:
            rule.active = request.active

        db.commit()
        db.refresh(rule)

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return rule


@router.delete("/budgets/{recurring_id}")
def delete_recurring_budget(
    recurring_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        rule = (
            db.query(RecurringBudget)
            .filter(
                RecurringBudget.id == recurring_id,
                RecurringBudget.user_id == user_id_int,
            )
            .first()
        )

        if not rule:
            raise ResourceNotFoundError("Recurring budget not found")

        db.delete(rule)
        db.commit()

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return {"message": "Recurring budget deleted"}

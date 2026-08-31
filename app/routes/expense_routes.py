import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.currency import normalize_currency
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import DatabaseError, ResourceNotFoundError
from app.model import Expense
from app.schemas.expense_schemas import (
    CategoryAmount,
    DailyCategoryAmount,
    ExpenseBreakdownResponse,
    ExpenseCreateRequest,
    ExpenseDailyBreakdownResponse,
    ExpenseListResponse,
    ExpenseResponse,
    ExpenseUpdateRequest,
)
from app.services.notifications import notify_if_threshold_crossed
from app.services.recurrence import materialize_due_recurrences
from app.tools.expense_tools import (
    _budget_spent,
    _budgets_covering,
    build_expense_query,
    get_user_currency,
    resolve_date,
    resolve_range,
    to_datetime_start,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Expenses"])


def _resolve_period_filter(
    db: Session,
    user_id: int,
    start_date: str | None,
    end_date: str | None,
    period: str | None,
):
    """Shared start/end resolution for the list/breakdown endpoints.

    Returns (start, end) as plain dates, or (None, None) when no filter was
    given. Raises HTTPException(422) on an invalid date/period — this is a
    REST endpoint, so bad input is a client error, not a chat-style
    friendly-string response.
    """

    if period:
        resolved_range = resolve_range(period)

        if not resolved_range:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Invalid period. Use a value such as 'this week', "
                    "'last month', or 'August 25 to August 31'."
                ),
            )

        return resolved_range

    if start_date or end_date:
        if not start_date or not end_date:
            raise HTTPException(
                status_code=422,
                detail="Provide both start_date and end_date.",
            )

        start = resolve_date(start_date)
        end = resolve_date(end_date)

        if not start or not end:
            raise HTTPException(
                status_code=422,
                detail="Invalid start_date/end_date.",
            )

        return start, end + timedelta(days=1)

    return None, None


# ============================================================
# Static routes first — see PUT/DELETE /{expense_id} below for why.
# ============================================================

@router.get("/expenses", response_model=ExpenseListResponse)
def list_expenses(
    start_date: str | None = None,
    end_date: str | None = None,
    period: str | None = None,
    category: str | None = None,
    currency: str | None = None,
    thread_id: str | None = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    materialize_due_recurrences(db, user_id_int)

    try:
        start, end = _resolve_period_filter(db, user_id_int, start_date, end_date, period)

        # thread_id=None (the default) is the user-level aggregate, spanning
        # every conversation thread the user has ever logged an expense in.
        # Passing one narrows to that single thread — used by the chat side
        # panel to show only what's relevant to the open conversation.
        query = build_expense_query(
            db=db,
            user_id=user_id_int,
            thread_id=thread_id,
            start_date=start,
            end_date=end,
            category=category,
        )

        if currency:
            query = query.filter(
                Expense.currency == normalize_currency(currency, currency)
            )

        expenses = query.order_by(Expense.expense_date.desc()).all()

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"expenses": expenses}


@router.post("/expenses", response_model=ExpenseResponse)
def create_expense(
    request: ExpenseCreateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    expense_date = resolve_date(request.date)

    if not expense_date:
        raise HTTPException(status_code=422, detail="Invalid date.")

    try:
        expense = Expense(
            user_id=user_id_int,
            thread_id=request.thread_id,
            amount=request.amount,
            category=request.category,
            description=request.description,
            currency=normalize_currency(
                request.currency, get_user_currency(db, user_id_int)
            ),
            expense_date=to_datetime_start(expense_date),
        )

        db.add(expense)
        db.commit()
        db.refresh(expense)

        for budget in _budgets_covering(
            db, user_id_int, request.thread_id, expense.currency, expense_date,
        ):
            spent_after = _budget_spent(db, user_id_int, request.thread_id, budget)
            notify_if_threshold_crossed(
                db, user_id_int, budget, spent_after - expense.amount, expense,
            )

        db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    logger.info(
        "Expense created via REST: user_id=%s expense_id=%s",
        user_id, expense.id,
    )

    return expense


@router.get("/expenses/breakdown", response_model=ExpenseBreakdownResponse)
def get_expenses_breakdown(
    start_date: str | None = None,
    end_date: str | None = None,
    period: str | None = None,
    thread_id: str | None = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    materialize_due_recurrences(db, user_id_int)

    try:
        start, end = _resolve_period_filter(db, user_id_int, start_date, end_date, period)

        query = build_expense_query(
            db=db, user_id=user_id_int, thread_id=thread_id,
            start_date=start, end_date=end,
        )

        expenses = query.all()

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    totals = {}

    for expense in expenses:
        key = (expense.category, expense.currency)
        totals.setdefault(key, 0.0)
        totals[key] += float(expense.amount)

    breakdown = [
        CategoryAmount(category=category, currency=currency, amount=amount)
        for (category, currency), amount in sorted(totals.items())
    ]

    return {"breakdown": breakdown}


@router.get(
    "/expenses/daily-breakdown", response_model=ExpenseDailyBreakdownResponse,
)
def get_expenses_daily_breakdown(
    start_date: str | None = None,
    end_date: str | None = None,
    period: str | None = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)
    materialize_due_recurrences(db, user_id_int)

    try:
        start, end = _resolve_period_filter(db, user_id_int, start_date, end_date, period)

        query = build_expense_query(
            db=db, user_id=user_id_int, thread_id=None,
            start_date=start, end_date=end,
        )

        expenses = query.all()

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    totals = {}

    for expense in expenses:
        key = (expense.expense_date.date(), expense.category, expense.currency)
        totals.setdefault(key, 0.0)
        totals[key] += float(expense.amount)

    daily = [
        DailyCategoryAmount(date=day, category=category, currency=currency, amount=amount)
        for (day, category, currency), amount in sorted(totals.items())
    ]

    return {"daily": daily}


# ============================================================
# Dynamic /{expense_id} routes — must come after the static
# /expenses/breakdown and /expenses/daily-breakdown routes above,
# or Starlette's router would match "breakdown" as an expense_id.
# ============================================================

@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    request: ExpenseUpdateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        expense = (
            db.query(Expense)
            .filter(Expense.id == expense_id, Expense.user_id == user_id_int)
            .first()
        )

        if not expense:
            raise ResourceNotFoundError("Expense not found")

        if request.amount is not None:
            expense.amount = request.amount

        if request.category is not None:
            expense.category = request.category

        if request.description is not None:
            expense.description = request.description

        if request.date is not None:
            resolved = resolve_date(request.date)

            if not resolved:
                raise HTTPException(status_code=422, detail="Invalid date.")

            expense.expense_date = to_datetime_start(resolved)

        if request.currency is not None:
            expense.currency = normalize_currency(request.currency, expense.currency)

        db.commit()
        db.refresh(expense)

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return expense


@router.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        expense = (
            db.query(Expense)
            .filter(Expense.id == expense_id, Expense.user_id == user_id_int)
            .first()
        )

        if not expense:
            raise ResourceNotFoundError("Expense not found")

        db.delete(expense)
        db.commit()

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return {"message": "Expense deleted"}

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.model import Budget, Expense, RecurringBudget, RecurringExpense
from app.services.notifications import notify_if_threshold_crossed
from app.tools.expense_tools import (
    _budget_spent,
    _budgets_covering,
    add_month,
    to_datetime_start,
)


def _advance(current: datetime, frequency: str) -> datetime:
    if frequency == "daily":
        return current + timedelta(days=1)

    if frequency == "weekly":
        return current + timedelta(days=7)

    if frequency == "monthly":
        return to_datetime_start(add_month(current.date()))

    raise ValueError(f"Unknown recurrence frequency: {frequency!r}")


def materialize_due_recurrences(db: Session, user_id: int) -> None:
    """Create any Expense/Budget rows a user's recurring rules are due for.

    There's no background worker in this app, so recurring items are
    materialized lazily whenever a user's data is read or written — once at
    the top of the chat endpoint (covering every tool call in that turn) and
    once at the top of each expense/budget/recurring REST endpoint. Looping
    per-rule backfills every missed occurrence if nobody looked in a while,
    not just the most recent one, and is naturally idempotent: nothing to
    re-run, since `next_run_date`/`next_period_start` only advance past `now`
    once caught up.
    """

    now = to_datetime_start(datetime.now(timezone.utc).date())

    expense_rules = (
        db.query(RecurringExpense)
        .filter(
            RecurringExpense.user_id == user_id,
            RecurringExpense.active.is_(True),
            RecurringExpense.next_run_date <= now,
        )
        .all()
    )

    for rule in expense_rules:
        while rule.next_run_date <= now:
            expense_date = rule.next_run_date

            # Budgets covering this occurrence, and each one's spent total
            # BEFORE this occurrence is added. This app's SessionLocal is
            # configured with autoflush=False (see app/database.py), so an
            # uncommitted db.add() from an earlier loop iteration is NOT
            # visible to this query unless flushed explicitly — without the
            # flush below, every occurrence in a backfill would compute
            # spent_before as if it were the first, silently never
            # crossing any threshold no matter how many occurrences ran.
            covering = _budgets_covering(
                db, rule.user_id, rule.thread_id, rule.currency,
                expense_date.date(),
            )
            spent_before = {
                budget.id: _budget_spent(db, rule.user_id, rule.thread_id, budget)
                for budget in covering
            }

            expense = Expense(
                user_id=rule.user_id,
                thread_id=rule.thread_id,
                amount=rule.amount,
                category=rule.category,
                description=rule.description,
                currency=rule.currency,
                expense_date=expense_date,
            )
            db.add(expense)
            db.flush()

            for budget in covering:
                notify_if_threshold_crossed(
                    db, rule.user_id, budget, spent_before[budget.id], expense,
                )

            rule.next_run_date = _advance(rule.next_run_date, rule.frequency)

    budget_rules = (
        db.query(RecurringBudget)
        .filter(
            RecurringBudget.user_id == user_id,
            RecurringBudget.active.is_(True),
            RecurringBudget.next_period_start <= now,
        )
        .all()
    )

    for rule in budget_rules:
        while rule.next_period_start <= now:
            period_start = rule.next_period_start
            period_end = _advance(period_start, rule.frequency)

            db.add(
                Budget(
                    user_id=rule.user_id,
                    thread_id=rule.thread_id,
                    amount=rule.amount,
                    currency=rule.currency,
                    period_start=period_start,
                    period_end=period_end,
                )
            )
            rule.next_period_start = period_end

    if expense_rules or budget_rules:
        db.commit()

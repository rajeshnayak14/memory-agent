from app.currency import format_money
from app.model import Budget, Expense, Notification
from app.tools.expense_tools import format_range


def notify_if_threshold_crossed(
    db,
    user_id: int,
    budget: Budget,
    spent_before: float,
    expense: Expense,
) -> Notification | None:
    """Create a Notification the first time `expense` pushes `budget` past
    the 80% warn or 100% over-budget line.

    `spent_before` must be `_budget_spent(db, ...)` computed BEFORE
    `expense` was added to `db`'s session — this is what makes the check
    fire only on the crossing, not on every subsequent expense once a
    budget is already over. Fires at most one notification per call: if a
    single expense crosses both thresholds at once, only the higher
    (over-budget) one is raised.
    """
    if budget.currency != expense.currency or not budget.amount:
        return None

    spent_after = spent_before + float(expense.amount)
    pct_before = spent_before / float(budget.amount) * 100
    pct_after = spent_after / float(budget.amount) * 100
    period = format_range(
        budget.period_start.date(), budget.period_end.date(),
    )

    if pct_before < 100 <= pct_after:
        kind, title = "budget_over", "Over budget"
        body = (
            f"You've gone over your {format_money(budget.amount, budget.currency)} "
            f"budget for {period}."
        )
    elif pct_before < 80 <= pct_after:
        kind, title = "budget_warn", "Approaching budget limit"
        body = (
            f"You've used {pct_after:.0f}% of your "
            f"{format_money(budget.amount, budget.currency)} budget for {period}."
        )
    else:
        return None

    notification = Notification(
        user_id=user_id,
        budget_id=budget.id,
        type=kind,
        title=title,
        body=body,
        read=False,
    )
    db.add(notification)
    return notification

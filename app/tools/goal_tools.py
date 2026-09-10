from langchain_core.tools import tool

from app.currency import format_money, normalize_currency
from app.database import SessionLocal
from app.model import Goal
from app.tools.expense_tools import (
    get_current_thread,
    get_user_currency,
    resolve_date,
    to_datetime_start,
)


def _find_goal(db, user_id, goal_id):
    query = db.query(Goal).filter(Goal.user_id == user_id)

    if goal_id:
        return query.filter(Goal.id == goal_id).first()

    goals = query.order_by(Goal.created_at.desc(), Goal.id.desc()).all()

    return goals[0] if goals else None


def _goal_pct(goal: Goal) -> float:
    if not goal.target_amount:
        return 0.0
    return min(100.0, goal.current_amount / goal.target_amount * 100)


def _goal_line(goal: Goal, prefix: str = "") -> str:
    return (
        f"{prefix}\"{goal.name}\": {format_money(goal.current_amount, goal.currency)} "
        f"of {format_money(goal.target_amount, goal.currency)} "
        f"({_goal_pct(goal):.0f}%). [#{goal.id}]"
    )


@tool
def manage_goal(
    action: str,
    goal_id: int | None = None,
    name: str | None = None,
    target_amount: float | None = None,
    amount: float | None = None,
    currency: str | None = None,
    target_date: str | None = None,
) -> str:
    """
    Manage savings goals — NOT the same thing as a budget.

    Actions:
    - create (needs name, target_amount)
    - contribute (needs amount; adds to progress, can be negative)
    - list
    - update (any of name/target_amount/currency/target_date)
    - delete

    Goals are per-account, not per-conversation-thread — visible from
    any chat. If contribute/update/delete has no goal_id, the most
    recently created goal is targeted; call action="list" first if
    unsure which one that is.

    target_date only accepts an actual date ("today", "2026-09-01",
    "August 25"), never a vague period like "this month".
    """

    user_id, _ = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    user_id = int(user_id)
    action = (action or "").strip().lower()

    if action not in {"create", "contribute", "list", "update", "delete"}:
        return "Unsupported goal operation."

    db = SessionLocal()

    try:
        if action == "create":
            if not name:
                return "A goal needs a name."

            if target_amount is None or float(target_amount) <= 0:
                return "A goal's target amount must be greater than zero."

            resolved_date = None
            if target_date:
                resolved = resolve_date(target_date)
                if not resolved:
                    return "Invalid target date."
                resolved_date = to_datetime_start(resolved)

            goal = Goal(
                user_id=user_id,
                name=name,
                target_amount=float(target_amount),
                current_amount=0,
                currency=normalize_currency(
                    currency, get_user_currency(db, user_id)
                ),
                target_date=resolved_date,
            )

            db.add(goal)
            db.commit()
            db.refresh(goal)

            return "Created goal " + _goal_line(goal)

        if action == "list":
            goals = (
                db.query(Goal)
                .filter(Goal.user_id == user_id)
                .order_by(Goal.created_at.desc())
                .all()
            )

            if not goals:
                return "No savings goals yet."

            return "\n".join(_goal_line(g) for g in goals)

        target = _find_goal(db, user_id, goal_id)

        if not target:
            return "No matching goal was found."

        if action == "contribute":
            if amount is None:
                return "Specify an amount to contribute."

            target.current_amount = max(0.0, target.current_amount + float(amount))
            db.commit()
            db.refresh(target)

            return "Updated " + _goal_line(target)

        if action == "update":
            if name is not None:
                target.name = name

            if target_amount is not None:
                target.target_amount = float(target_amount)

            if currency is not None:
                target.currency = normalize_currency(currency, target.currency)

            if target_date is not None:
                resolved = resolve_date(target_date)
                if not resolved:
                    return "Invalid target date."
                target.target_date = to_datetime_start(resolved)

            db.commit()
            db.refresh(target)

            return "Updated " + _goal_line(target)

        name = target.name
        db.delete(target)
        db.commit()

        return f'Deleted goal "{name}".'

    finally:
        db.close()

from datetime import datetime, timedelta, timezone, date

from langchain_core.tools import tool
from langgraph.config import get_config
from sqlalchemy.orm import Session

from app.currency import format_money, normalize_currency
from app.database import SessionLocal
from app.model import Budget, Expense, RecurringBudget, RecurringExpense, User


# ============================================================
# DATE HELPERS
# ============================================================

def add_month(value: date):
    """First day of the month after the one `value` falls in."""
    if value.month == 12:
        return value.replace(year=value.year + 1, month=1, day=1)

    return value.replace(month=value.month + 1, day=1)


def subtract_month(value: date):
    """First day of the month before the one `value` falls in."""
    if value.month == 1:
        return value.replace(year=value.year - 1, month=12, day=1)

    return value.replace(month=value.month - 1, day=1)


def resolve_date(value: str):
    today = datetime.now(timezone.utc).date()
    value = value.strip().lower()

    if value == "today":
        return today

    if value == "yesterday":
        return today - timedelta(days=1)

    if value == "tomorrow":
        return today + timedelta(days=1)

    formats = (
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
        "%B %d",
        "%b %d",
        "%d %B",
        "%d %b",
    )

    for fmt in formats:
        try:
            parsed = datetime.strptime(value, fmt).date()

        except ValueError:
            continue

        # Only formats without a year directive need one inferred; the others
        # already carry the year the user asked for and must not be rewritten.
        if "%Y" not in fmt:
            try:
                parsed = parsed.replace(year=today.year)
            except ValueError:
                # Feb 29 in a non-leap year.
                return None

        return parsed

    return None


def resolve_range(value: str):
    today = datetime.now(timezone.utc).date()
    value = value.strip().lower()

    if value == "today":
        return today, today + timedelta(days=1)

    if value == "yesterday":
        start = today - timedelta(days=1)
        return start, today

    if value == "this week":
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=7)

    if value == "last week":
        end = today - timedelta(days=today.weekday())
        start = end - timedelta(days=7)
        return start, end

    if value == "next week":
        start = today - timedelta(days=today.weekday()) + timedelta(days=7)
        return start, start + timedelta(days=7)

    if value == "this month":
        start = today.replace(day=1)
        return start, add_month(start)

    if value == "last month":
        end = today.replace(day=1)
        return subtract_month(end), end

    if value == "next month":
        start = add_month(today.replace(day=1))
        return start, add_month(start)

    if value == "this year":
        start = today.replace(month=1, day=1)
        return start, start.replace(year=start.year + 1)

    if value == "last year":
        end = today.replace(month=1, day=1)
        return end.replace(year=end.year - 1), end

    # --------------------------------------------------------
    # Custom range:
    #
    # August 25 to August 31
    # Aug 25 - Aug 31
    # 2026-08-25 to 2026-08-31
    # --------------------------------------------------------

    for separator in (" to ", " through ", " until ", " - ", " – "):
        if separator not in value:
            continue

        first, second = value.split(separator, 1)

        start = resolve_date(first)
        end = resolve_date(second)

        if start and end and end >= start:
            # End date is inclusive for the user.
            return start, end + timedelta(days=1)

    return None


def get_current_thread():
    config = get_config()
    configurable = config.get("configurable", {})

    user_id = configurable.get("user_id")
    thread_id = configurable.get("thread_id")

    return user_id, thread_id


def get_user_currency(db: Session, user_id: int) -> str:
    currency = (
        db.query(User.preferred_currency)
        .filter(User.id == user_id)
        .scalar()
    )
    return currency or "INR"


def to_datetime_start(value):
    """UTC midnight for a date.

    Every timestamp is stored as UTC midnight, so comparisons must be made
    against explicit UTC datetimes. Handing a bare `date` to a timestamptz
    column instead lets Postgres resolve it in the *server's* timezone, which
    shifts every day boundary and drops rows outright when the server is west
    of UTC. Accepts a datetime too, so callers can pass either safely.
    """
    return datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)


def format_range(start, end_exclusive):
    end = end_exclusive - timedelta(days=1)
    if start == end:
        return start.strftime("%B %d, %Y")
    return f"{start.strftime('%B %d, %Y')} to {end.strftime('%B %d, %Y')}"


# ============================================================
# EXPENSE QUERY
# ============================================================

def build_expense_query(
    db: Session,
    user_id: int,
    thread_id: str | None,
    date=None,
    start_date=None,
    end_date=None,
    category=None,
):
    query = db.query(Expense).filter(Expense.user_id == user_id)

    if thread_id is not None:
        query = query.filter(Expense.thread_id == thread_id)

    if date:
        query = query.filter(
            Expense.expense_date >= to_datetime_start(date),
            Expense.expense_date < to_datetime_start(
                date + timedelta(days=1)
            ),
        )

    if start_date:
        query = query.filter(
            Expense.expense_date >= to_datetime_start(start_date)
        )

    if end_date:
        query = query.filter(
            Expense.expense_date < to_datetime_start(end_date)
        )

    if category:
        query = query.filter(
            Expense.category.ilike(category)
        )

    return query


# ============================================================
# ADD EXPENSE
# ============================================================

@tool
def add_expense(
    amount: float,
    category: str,
    description: str,
    date: str = "today",
    currency: str | None = None,
) -> str:
    """
    Add an expense to the current conversation thread.

    Examples:
    - amount=300, category="food",
      description="lunch", date="today"

    date only accepts an actual date ("today", "yesterday", "2026-09-01",
    "August 25") — never a vague relative period like "this week" or
    "this month" (those aren't parseable and will fail). If the user
    gives a vague period like that without naming a specific day, just
    use "today".

    If currency is not given, the user's preferred currency is used.
    """

    user_id, thread_id = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    if not thread_id:
        return "Unable to determine the current conversation."

    if amount is None or float(amount) <= 0:
        return "An expense amount must be greater than zero."

    expense_date = resolve_date(date)

    if not expense_date:
        return (
            "Invalid date. Please use a date such as "
            "'today', 'yesterday', or 'August 25'."
        )

    db = SessionLocal()

    try:
        user_id_int = int(user_id)
        resolved_currency = normalize_currency(
            currency, get_user_currency(db, user_id_int)
        )

        expense = Expense(
            user_id=user_id_int,
            thread_id=thread_id,
            amount=float(amount),
            category=category,
            description=description,
            currency=resolved_currency,
            expense_date=to_datetime_start(expense_date),
        )

        db.add(expense)
        db.commit()
        db.refresh(expense)

        lines = [
            f"I've added a {format_money(expense.amount, expense.currency)} "
            f"expense for {category} ({description}) on "
            f"{expense_date.strftime('%B %d, %Y')}. [#{expense.id}]"
        ]

        # Local import: app.services.notifications imports format_range
        # from this module, so a top-level import here would be circular.
        from app.services.notifications import notify_if_threshold_crossed

        for budget in _budgets_covering(
            db, user_id_int, thread_id, expense.currency, expense_date,
        ):
            spent = _budget_spent(db, user_id_int, thread_id, budget)
            notify_if_threshold_crossed(
                db, user_id_int, budget, spent - float(expense.amount), expense,
            )
            used_pct = (
                (spent / float(budget.amount) * 100)
                if budget.amount
                else 0
            )

            if used_pct >= 80:
                lines.append(_budget_alert_text(budget, spent, used_pct))

        db.commit()

        return "\n".join(lines)

    finally:
        db.close()


# ============================================================
# GET EXPENSES
# ============================================================

@tool
def get_expenses(
    date: str | None = None,
    period: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    category: str | None = None,
) -> str:
    """
    Get expenses from the current conversation thread.

    Supports:

    date:
        today
        yesterday
        August 25
        2026-08-25

    period:
        today
        yesterday
        this week
        last week
        this month
        last month
        August 25 to August 31

    start_date/end_date:
        Custom date range.
    """

    user_id, thread_id = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    if not thread_id:
        return "Unable to determine the current conversation."

    db = SessionLocal()

    try:
        query = build_expense_query(
            db=db,
            user_id=int(user_id),
            thread_id=thread_id,
            category=category,
        )

        # ----------------------------------------------------
        # Single date
        # ----------------------------------------------------

        if date:
            resolved = resolve_date(date)

            if not resolved:
                return (
                    "Invalid date. Please provide a date such as "
                    "'August 25' or '2026-08-25'."
                )

            query = build_expense_query(
                db=db,
                user_id=int(user_id),
                thread_id=thread_id,
                date=resolved,
                category=category,
            )

        # ----------------------------------------------------
        # Period / range
        # ----------------------------------------------------

        elif period:
            resolved_range = resolve_range(period)

            if not resolved_range:
                return (
                    "I can't retrieve expenses for that specific "
                    "period. Please provide a valid date range or "
                    "period (e.g., 'this week', 'last month', or "
                    "'August 25 to August 31')."
                )

            start, end = resolved_range

            query = build_expense_query(
                db=db,
                user_id=int(user_id),
                thread_id=thread_id,
                start_date=start,
                end_date=end,
                category=category,
            )

        # ----------------------------------------------------
        # Explicit custom range
        # ----------------------------------------------------

        elif start_date or end_date:
            if not start_date or not end_date:
                return (
                    "Please provide both a start date and "
                    "an end date."
                )

            start = resolve_date(start_date)
            end = resolve_date(end_date)

            if not start or not end:
                return (
                    "Invalid date range. Please provide dates "
                    "such as 'August 25' and 'August 31'."
                )

            query = build_expense_query(
                db=db,
                user_id=int(user_id),
                thread_id=thread_id,
                start_date=start,
                end_date=end + timedelta(days=1),
                category=category,
            )

        expenses = (
            query
            .order_by(Expense.expense_date.asc())
            .all()
        )

        if not expenses:
            return "No expenses found for the requested period."

        totals_by_currency = {}

        for expense in expenses:
            totals_by_currency.setdefault(expense.currency, 0.0)
            totals_by_currency[expense.currency] += float(expense.amount)

        # Amounts in different currencies are never summed together —
        # each currency present gets its own total line.
        lines = [
            f"Total spending: {format_money(amount, currency)}"
            for currency, amount in sorted(totals_by_currency.items())
        ]

        for expense in expenses:
            lines.append(
                f"- [#{expense.id}] "
                f"{format_money(expense.amount, expense.currency)} "
                f"{expense.category}: "
                f"{expense.description}"
            )

        return "\n".join(lines)

    finally:
        db.close()


# ============================================================
# EXPENSE BREAKDOWN
# ============================================================

def resolve_expense_breakdown(
    db,
    user_id: int,
    thread_id: str,
    date: str | None = None,
    period: str | None = None,
):
    """Shared by get_expense_breakdown and chat_routes.py's structured
    card, so both compute byte-identical category totals.

    Returns (breakdown, totals_by_currency, error). `breakdown` is
    {(category, currency): amount}; `totals_by_currency` is
    {currency: amount}. `error` is a user-facing message when date/period
    failed to parse — both other values are empty dicts in that case.
    """
    user_id = int(user_id)

    query = build_expense_query(
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )

    if date:
        resolved = resolve_date(date)

        if not resolved:
            return {}, {}, "Invalid date."

        query = build_expense_query(
            db=db,
            user_id=user_id,
            thread_id=thread_id,
            date=resolved,
        )

    elif period:
        resolved_range = resolve_range(period)

        if not resolved_range:
            return {}, {}, "Invalid period."

        start, end = resolved_range

        query = build_expense_query(
            db=db,
            user_id=user_id,
            thread_id=thread_id,
            start_date=start,
            end_date=end,
        )

    breakdown = {}
    totals_by_currency = {}

    for expense in query.all():
        key = (expense.category, expense.currency)
        breakdown.setdefault(key, 0.0)
        breakdown[key] += float(expense.amount)

        totals_by_currency.setdefault(expense.currency, 0.0)
        totals_by_currency[expense.currency] += float(expense.amount)

    return breakdown, totals_by_currency, None


@tool
def get_expense_breakdown(
    date: str | None = None,
    period: str | None = None,
) -> str:
    """
    Get spending grouped by category for the current thread.
    """

    user_id, thread_id = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    if not thread_id:
        return "Unable to determine the current conversation."

    db = SessionLocal()

    try:
        breakdown, totals_by_currency, error = resolve_expense_breakdown(
            db, user_id, thread_id, date, period,
        )

        if error:
            return error

        if not breakdown:
            return "No expenses found for the requested period."

        lines = [
            f"Total spending: {format_money(amount, currency)}"
            for currency, amount in sorted(totals_by_currency.items())
        ]

        for (category, currency), amount in sorted(breakdown.items()):
            lines.append(
                f"- {category} ({currency}): {format_money(amount, currency)}"
                if len(totals_by_currency) > 1
                else f"- {category}: {format_money(amount, currency)}"
            )

        return "\n".join(lines)

    finally:
        db.close()


# ============================================================
# DAILY BREAKDOWN
# ============================================================

@tool
def get_expense_daily_breakdown(
    date: str | None = None,
    period: str | None = None,
) -> str:
    """
    Get spending grouped by date and category.
    """

    user_id, thread_id = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    if not thread_id:
        return "Unable to determine the current conversation."

    db = SessionLocal()

    try:
        query = build_expense_query(
            db=db,
            user_id=int(user_id),
            thread_id=thread_id,
        )

        if date:
            resolved = resolve_date(date)

            if not resolved:
                return "Invalid date."

            query = build_expense_query(
                db=db,
                user_id=int(user_id),
                thread_id=thread_id,
                date=resolved,
            )

        elif period:
            resolved_range = resolve_range(period)

            if not resolved_range:
                return "Invalid period."

            start, end = resolved_range

            query = build_expense_query(
                db=db,
                user_id=int(user_id),
                thread_id=thread_id,
                start_date=start,
                end_date=end,
            )

        expenses = (
            query
            .order_by(Expense.expense_date.asc())
            .all()
        )

        if not expenses:
            return "No expenses found for the requested period."

        grouped = {}
        currencies_seen = {expense.currency for expense in expenses}

        for expense in expenses:
            day = expense.expense_date.date()

            grouped.setdefault(day, {})

            key = (expense.category, expense.currency)
            grouped[day].setdefault(key, 0.0)
            grouped[day][key] += float(expense.amount)

        lines = []

        for day, categories in grouped.items():
            lines.append(
                day.strftime("%B %d, %Y")
            )

            for (category, currency), amount in categories.items():
                lines.append(
                    f"- {category} ({currency}): {format_money(amount, currency)}"
                    if len(currencies_seen) > 1
                    else f"- {category}: {format_money(amount, currency)}"
                )

        return "\n".join(lines)

    finally:
        db.close()


# ============================================================
# BUDGET MANAGER
# ============================================================


def _active_budgets(db, user_id, thread_id, all_threads=False):
    user_id = int(user_id)

    now = datetime.now(timezone.utc)

    filters = [
        Budget.user_id == user_id,
        Budget.period_start <= now,
        Budget.period_end > now,
    ]

    if not all_threads:
        filters.append(Budget.thread_id == thread_id)

    return (
        db.query(Budget)
        .filter(*filters)
        .order_by(
            Budget.created_at.desc(),
            Budget.id.desc(),
        )
        .all()
    )


def _budgets_covering(db, user_id, thread_id, currency, at):
    """Budgets (any currency-matching) whose period covers a given date.

    Unlike `_active_budgets`, this checks against a specific expense date
    rather than "now" — a backdated expense should still trigger an alert
    for the budget covering the date it was actually logged against.
    """
    user_id = int(user_id)
    at_dt = to_datetime_start(at)

    return (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.thread_id == thread_id,
            Budget.currency == currency,
            Budget.period_start <= at_dt,
            Budget.period_end > at_dt,
        )
        .all()
    )


def _find_budget(
    db,
    user_id: int,
    thread_id: str,
    start: date,
    end_exclusive: date,
    all_threads: bool = False,
):
    user_id = int(user_id)

    filters = [
        Budget.user_id == user_id,
        Budget.period_start == to_datetime_start(start),
        Budget.period_end == to_datetime_start(end_exclusive),
    ]

    if not all_threads:
        filters.append(Budget.thread_id == thread_id)

    return (
        db.query(Budget)
        .filter(*filters)
        .order_by(Budget.created_at.desc(), Budget.id.desc())
        .first()
    )


BUDGET_ACTION_ALIASES = {
    "add": "increase",
    "raise": "increase",
    "increase_by": "increase",
    "reduce": "decrease",
    "lower": "decrease",
    "decrease_by": "decrease",
    "remove": "delete",
    "current": "status",
    "balance": "status",
    "remaining": "status",
    "summary": "status",
}


def normalize_budget_action(action: str | None) -> str:
    """Canonicalize a budget_manager action string (handles synonyms like
    "balance"/"current" -> "status"). Shared with chat_routes.py so a raw
    tool_call's args can be matched against the same alias list."""
    normalized = (
        (action or "")
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )
    return BUDGET_ACTION_ALIASES.get(normalized, normalized)


def resolve_budget_target(
    db,
    user_id: int,
    thread_id: str,
    start_date: str | None = None,
    end_date: str | None = None,
    all_threads: bool = False,
    period: str | None = None,
):
    """Resolve the budget budget_manager's status/increase/decrease/delete
    actions target: the exact period if dates (or a relative `period`
    phrase) are given, otherwise the currently active budget. Shared with
    chat_routes.py so the structured chat card re-resolves the
    byte-identical target the tool used.

    `period` (e.g. "this month", "this week", "last month") is resolved
    against today's actual calendar date via `resolve_range` — this must
    be used for any relative phrase instead of start_date/end_date, since
    those only accept real dates and relative phrases aren't parseable
    dates. Ignored if start_date/end_date are also given.

    `all_threads` widens the search to every conversation this user has
    (not just `thread_id`) — used only for an explicit "check my budget
    from memory"-style request; the default stays scoped to this thread.

    Returns (target, start, end, explicit_period). `target` is None if no
    matching budget exists; `start`/`end` are None unless an explicit
    period was requested (and was valid).
    """
    explicit_period = bool(start_date or end_date or period)

    if period and not (start_date or end_date):
        resolved_range = resolve_range(period)

        if not resolved_range:
            return None, None, None, explicit_period

        start, end = resolved_range

        return (
            _find_budget(db, user_id, thread_id, start, end, all_threads),
            start,
            end,
            explicit_period,
        )

    if explicit_period:
        if not start_date or not end_date:
            return None, None, None, explicit_period

        start = resolve_date(start_date)
        end_inclusive = resolve_date(end_date)

        if not start or not end_inclusive or end_inclusive < start:
            return None, None, None, explicit_period

        end = end_inclusive + timedelta(days=1)

        return (
            _find_budget(db, user_id, thread_id, start, end, all_threads),
            start,
            end,
            explicit_period,
        )

    active = _active_budgets(db, user_id, thread_id, all_threads)

    return (active[0] if active else None), None, None, explicit_period


def _budget_spent(
    db, user_id: int, thread_id: str, budget: Budget, all_threads: bool = False,
) -> float:
    user_id = int(user_id)

    filters = [
        Expense.user_id == user_id,
        Expense.currency == budget.currency,
        Expense.expense_date >= budget.period_start,
        Expense.expense_date < budget.period_end,
    ]

    if not all_threads:
        filters.append(Expense.thread_id == thread_id)

    expenses = db.query(Expense).filter(*filters).all()
    return sum(float(e.amount) for e in expenses)


def _budget_text(budget: Budget, spent: float) -> str:
    remaining = float(budget.amount) - spent
    used = (spent / float(budget.amount) * 100) if budget.amount else 0
    return (
        f"You have {format_money(remaining, budget.currency)} left from your "
        f"budget of {format_money(budget.amount, budget.currency)} for "
        f"{format_range(budget.period_start.date(), budget.period_end.date())}, "
        f"after spending {format_money(spent, budget.currency)}."
        f"\nUsed: {used:.1f}%"
    )


def _budget_alert_text(budget: Budget, spent: float, used_pct: float) -> str:
    period = format_range(
        budget.period_start.date(), budget.period_end.date(),
    )

    if used_pct >= 100:
        over = spent - float(budget.amount)
        return (
            f"⚠️ You've gone {format_money(over, budget.currency)} over your "
            f"{format_money(budget.amount, budget.currency)} budget for "
            f"{period}."
        )

    return (
        f"⚠️ You've used {used_pct:.0f}% of your "
        f"{format_money(budget.amount, budget.currency)} budget for {period}."
    )


@tool
def budget_manager(
    action: str,
    amount: float | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    currency: str | None = None,
    search_all_conversations: bool = False,
    period: str | None = None,
) -> str:
    """
    Manage budgets in the current conversation thread.

    Actions:
    - set
    - update
    - increase
    - decrease
    - status
    - list
    - delete

    If status/increase/decrease/delete has no dates AND no period, the
    currently active budget for the current thread is targeted.

    For a relative phrase like "this month", "this week", "last month",
    "next week" — including for set/update, e.g. "set my budget to 8500
    for this month" — use the `period` parameter, NEVER start_date/
    end_date. `period` is resolved against today's real calendar date on
    the server; you must not compute or guess the actual dates yourself.

    Only use start_date/end_date for an explicit, named date range (e.g.
    "from August 25 to August 31"), with real dates like "2026-09-01" or
    "today" — never a relative phrase.

    set/update ALWAYS need one of period or start_date+end_date — there
    is no "currently active" fallback when creating a brand new budget.

    For set/update, if currency is not given, the user's preferred
    currency is used.

    search_all_conversations: only set this True for "status" or "list"
    when the user EXPLICITLY asks to check across their other
    conversations or "from memory" (e.g. "what's my budget from memory",
    "check my budget across all my chats"). Leave it False by default —
    a plain "what's my budget" stays scoped to this conversation only.
    Has no effect on set/update/increase/decrease/delete, which always
    target this conversation's own budget.
    """

    user_id, thread_id = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    if not thread_id:
        return "Unable to determine the current conversation."

    user_id = int(user_id)

    action = normalize_budget_action(action)

    allowed_actions = {
        "set",
        "update",
        "increase",
        "decrease",
        "status",
        "list",
        "delete",
    }

    if action not in allowed_actions:
        return "Unsupported budget operation."

    db = SessionLocal()

    try:
        # Explicit-period validation errors take priority over the generic
        # resolve_budget_target result, so surface them with the same
        # wording as before this was extracted into a shared helper.
        if start_date or end_date:
            if not start_date or not end_date:
                return "Please provide both a start date and an end date."

            parsed_start = resolve_date(start_date)
            parsed_end_inclusive = resolve_date(end_date)

            if (
                not parsed_start
                or not parsed_end_inclusive
                or parsed_end_inclusive < parsed_start
            ):
                return "Invalid budget date range."
        elif period and not resolve_range(period):
            return "Invalid period."

        # Only status/list honor a cross-conversation search — mutating
        # actions always stay scoped to this conversation's own budget.
        all_threads = search_all_conversations and action in {"status", "list"}

        target, start, end, explicit_period = resolve_budget_target(
            db, user_id, thread_id, start_date, end_date, all_threads, period,
        )

        # ---------------------------------------------------------
        # LIST
        # ---------------------------------------------------------
        if action == "list":
            budget_filters = [Budget.user_id == user_id]

            if not all_threads:
                budget_filters.append(Budget.thread_id == thread_id)

            budgets = (
                db.query(Budget)
                .filter(*budget_filters)
                .order_by(
                    Budget.period_start.desc(),
                    Budget.id.desc(),
                )
                .all()
            )

            if not budgets:
                return (
                    "No budgets have been set "
                    + ("across any of your conversations." if all_threads
                       else "in this conversation.")
                )

            lines = []

            for budget in budgets:
                spent = _budget_spent(
                    db,
                    user_id,
                    thread_id,
                    budget,
                    all_threads,
                )

                remaining = float(budget.amount) - spent

                lines.append(
                    f"{format_money(budget.amount, budget.currency)} | "
                    f"{format_range(budget.period_start.date(), budget.period_end.date())} | "
                    f"remaining {format_money(remaining, budget.currency)}"
                )

            return "\n".join(lines)

        # ---------------------------------------------------------
        # STATUS
        # ---------------------------------------------------------
        if action == "status":
            if not target:
                if explicit_period and start and end:
                    return (
                        f"No budget has been set for "
                        f"{format_range(start, end)}."
                    )

                return (
                    "No active budget has been set "
                    + ("across any of your conversations." if all_threads
                       else "in this conversation.")
                )

            spent = _budget_spent(
                db,
                user_id,
                thread_id,
                target,
                all_threads,
            )

            return _budget_text(
                target,
                spent,
            )

        # ---------------------------------------------------------
        # DELETE
        # ---------------------------------------------------------
        if action == "delete":
            if not target:
                if explicit_period and start and end:
                    return (
                        f"No budget has been set for "
                        f"{format_range(start, end)}."
                    )

                return (
                    "No active budget was found "
                    "to delete in this conversation."
                )

            period = format_range(
                target.period_start.date(),
                target.period_end.date(),
            )

            db.delete(target)
            db.commit()

            return f"Budget deleted for {period}."

        # ---------------------------------------------------------
        # SET / UPDATE
        # ---------------------------------------------------------
        if action in {"set", "update"}:
            if amount is None or amount <= 0:
                return "Budget amount must be greater than zero."

            if not start or not end:
                return (
                    "Please provide the budget start "
                    "and end dates."
                )

            if target:
                target.amount = float(amount)
                if currency:
                    target.currency = normalize_currency(currency, target.currency)
            else:
                target = Budget(
                    user_id=user_id,
                    thread_id=thread_id,
                    amount=float(amount),
                    currency=normalize_currency(
                        currency, get_user_currency(db, user_id)
                    ),
                    period_start=to_datetime_start(start),
                    period_end=to_datetime_start(end),
                )

                db.add(target)

            db.commit()
            db.refresh(target)

            return (
                f"Your budget of {format_money(target.amount, target.currency)} "
                f"has been set for {format_range(start, end)}."
            )

        # ---------------------------------------------------------
        # INCREASE / DECREASE
        # ---------------------------------------------------------
        if action in {"increase", "decrease"}:
            if amount is None or amount <= 0:
                return "Please provide an amount greater than zero."

            if not target:
                if explicit_period and start and end:
                    return (
                        f"No budget has been set for "
                        f"{format_range(start, end)}."
                    )

                return (
                    "No active budget was found "
                    "to change in this conversation."
                )

            current = float(target.amount)

            if action == "increase":
                new_amount = current + float(amount)
                verb = "increased"
            else:
                new_amount = current - float(amount)
                verb = "decreased"

            if new_amount <= 0:
                return (
                    "The resulting budget must be "
                    "greater than zero."
                )

            target.amount = new_amount

            db.commit()
            db.refresh(target)

            period = format_range(
                target.period_start.date(),
                target.period_end.date(),
            )

            return (
                f"Your budget has been {verb} by "
                f"{format_money(amount, target.currency)} to "
                f"{format_money(new_amount, target.currency)} for {period}."
            )

    finally:
        db.close()


# ============================================================
# EDIT / DELETE EXPENSE
# ============================================================

@tool
def manage_expense(
    action: str,
    expense_id: int | None = None,
    amount: float | None = None,
    category: str | None = None,
    description: str | None = None,
    date: str | None = None,
    currency: str | None = None,
) -> str:
    """
    Update or delete a specific expense in the current conversation thread.

    Expense IDs appear as [#id] in get_expenses output — look one up there
    if you don't already have it from earlier in the conversation.

    Actions:
    - update
    - delete

    date only accepts an actual date ("today", "yesterday", "2026-09-01",
    "August 25") — never a vague relative period like "this week" or
    "this month".
    """

    user_id, thread_id = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    if not thread_id:
        return "Unable to determine the current conversation."

    action = (action or "").strip().lower()

    if action not in {"update", "delete"}:
        return "Unsupported expense operation."

    if not expense_id:
        return "Please provide the expense ID to update or delete."

    db = SessionLocal()

    try:
        expense = (
            db.query(Expense)
            .filter(
                Expense.id == expense_id,
                Expense.user_id == int(user_id),
                Expense.thread_id == thread_id,
            )
            .first()
        )

        if not expense:
            return "No matching expense was found in this conversation."

        if action == "delete":
            db.delete(expense)
            db.commit()
            return f"Deleted expense [#{expense_id}]."

        if amount is not None:
            if float(amount) <= 0:
                return "An expense amount must be greater than zero."
            expense.amount = float(amount)

        if category is not None:
            expense.category = category

        if description is not None:
            expense.description = description

        if date is not None:
            resolved = resolve_date(date)

            if not resolved:
                return (
                    "Invalid date. Please use a date such as "
                    "'today', 'yesterday', or 'August 25'."
                )

            expense.expense_date = to_datetime_start(resolved)

        if currency is not None:
            expense.currency = normalize_currency(currency, expense.currency)

        db.commit()
        db.refresh(expense)

        return (
            f"Updated [#{expense.id}]: "
            f"{format_money(expense.amount, expense.currency)} for "
            f"{expense.category} ({expense.description}) on "
            f"{expense.expense_date.strftime('%B %d, %Y')}."
        )

    finally:
        db.close()


# ============================================================
# RECURRING EXPENSES
# ============================================================

def _find_recurring_expense(db, user_id, thread_id, recurring_id):
    query = db.query(RecurringExpense).filter(
        RecurringExpense.user_id == user_id,
        RecurringExpense.thread_id == thread_id,
    )

    if recurring_id:
        return query.filter(RecurringExpense.id == recurring_id).first()

    active = (
        query.filter(RecurringExpense.active.is_(True))
        .order_by(
            RecurringExpense.created_at.desc(),
            RecurringExpense.id.desc(),
        )
        .all()
    )

    return active[0] if active else None


@tool
def manage_recurring_expense(
    action: str,
    recurring_id: int | None = None,
    amount: float | None = None,
    category: str | None = None,
    description: str | None = None,
    frequency: str | None = None,
    start_date: str | None = None,
    currency: str | None = None,
) -> str:
    """
    Manage recurring expenses in the current conversation thread.

    Use this instead of add_expense when the user describes a repeating
    expense (e.g. "rent 15000 every month", "gym membership every week").

    Actions:
    - create
    - list
    - pause
    - resume
    - delete

    If pause/resume/delete has no recurring_id, the most recently created
    active recurring expense in this thread is targeted.

    start_date only accepts an actual date ("today", "2026-09-01",
    "August 25") — never a vague relative period like "this week" or
    "this month". Omit it to start today.
    """

    user_id, thread_id = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    if not thread_id:
        return "Unable to determine the current conversation."

    user_id = int(user_id)

    action = (action or "").strip().lower()

    if action not in {"create", "list", "pause", "resume", "delete"}:
        return "Unsupported recurring expense operation."

    db = SessionLocal()

    try:
        if action == "create":
            if amount is None or float(amount) <= 0:
                return "A recurring expense amount must be greater than zero."

            if not category or not description:
                return "Please provide a category and description."

            freq = (frequency or "").strip().lower()

            if freq not in {"daily", "weekly", "monthly"}:
                return "Frequency must be 'daily', 'weekly', or 'monthly'."

            if start_date:
                start = resolve_date(start_date)
                if not start:
                    return "Invalid start date."
            else:
                start = datetime.now(timezone.utc).date()

            rule = RecurringExpense(
                user_id=user_id,
                thread_id=thread_id,
                amount=float(amount),
                category=category,
                description=description,
                currency=normalize_currency(
                    currency, get_user_currency(db, user_id)
                ),
                frequency=freq,
                next_run_date=to_datetime_start(start),
                active=True,
            )

            db.add(rule)
            db.commit()
            db.refresh(rule)

            return (
                f"Created a recurring {freq} expense of "
                f"{format_money(rule.amount, rule.currency)} for {category} "
                f"({description}), starting {start.strftime('%B %d, %Y')}. "
                f"[#{rule.id}]"
            )

        if action == "list":
            rules = (
                db.query(RecurringExpense)
                .filter(
                    RecurringExpense.user_id == user_id,
                    RecurringExpense.thread_id == thread_id,
                )
                .order_by(RecurringExpense.created_at.desc())
                .all()
            )

            if not rules:
                return "No recurring expenses have been set in this conversation."

            lines = []

            for rule in rules:
                status = "active" if rule.active else "paused"
                lines.append(
                    f"[#{rule.id}] "
                    f"{format_money(rule.amount, rule.currency)} "
                    f"{rule.category} ({rule.description}), {rule.frequency}, "
                    f"next {rule.next_run_date.strftime('%B %d, %Y')} — {status}"
                )

            return "\n".join(lines)

        target = _find_recurring_expense(db, user_id, thread_id, recurring_id)

        if not target:
            return (
                "No matching recurring expense was found in this "
                "conversation."
            )

        if action == "delete":
            db.delete(target)
            db.commit()
            return f"Deleted recurring expense [#{target.id}]."

        target.active = action == "resume"
        db.commit()

        return (
            f"Recurring expense [#{target.id}] "
            f"{'resumed' if target.active else 'paused'}."
        )

    finally:
        db.close()


# ============================================================
# RECURRING BUDGETS
# ============================================================

def _find_recurring_budget(db, user_id, thread_id, recurring_id):
    query = db.query(RecurringBudget).filter(
        RecurringBudget.user_id == user_id,
        RecurringBudget.thread_id == thread_id,
    )

    if recurring_id:
        return query.filter(RecurringBudget.id == recurring_id).first()

    active = (
        query.filter(RecurringBudget.active.is_(True))
        .order_by(
            RecurringBudget.created_at.desc(),
            RecurringBudget.id.desc(),
        )
        .all()
    )

    return active[0] if active else None


@tool
def manage_recurring_budget(
    action: str,
    recurring_id: int | None = None,
    amount: float | None = None,
    frequency: str | None = None,
    start_date: str | None = None,
    currency: str | None = None,
) -> str:
    """
    Manage recurring budgets in the current conversation thread.

    Use this instead of budget_manager when the user wants a budget that
    resets every period (e.g. "budget 5000 every month").

    Actions:
    - create
    - list
    - pause
    - resume
    - delete

    If pause/resume/delete has no recurring_id, the most recently created
    active recurring budget in this thread is targeted.

    start_date only accepts an actual date ("today", "2026-09-01",
    "August 25") — never a vague relative period like "this week" or
    "this month". Omit it to start today.
    """

    user_id, thread_id = get_current_thread()

    if not user_id:
        return "Unable to determine the current user."

    if not thread_id:
        return "Unable to determine the current conversation."

    user_id = int(user_id)

    action = (action or "").strip().lower()

    if action not in {"create", "list", "pause", "resume", "delete"}:
        return "Unsupported recurring budget operation."

    db = SessionLocal()

    try:
        if action == "create":
            if amount is None or float(amount) <= 0:
                return "A recurring budget amount must be greater than zero."

            freq = (frequency or "").strip().lower()

            if freq not in {"weekly", "monthly"}:
                return "Frequency must be 'weekly' or 'monthly'."

            if start_date:
                start = resolve_date(start_date)
                if not start:
                    return "Invalid start date."
            else:
                start = datetime.now(timezone.utc).date()

            rule = RecurringBudget(
                user_id=user_id,
                thread_id=thread_id,
                amount=float(amount),
                currency=normalize_currency(
                    currency, get_user_currency(db, user_id)
                ),
                frequency=freq,
                next_period_start=to_datetime_start(start),
                active=True,
            )

            db.add(rule)
            db.commit()
            db.refresh(rule)

            return (
                f"Created a recurring {freq} budget of "
                f"{format_money(rule.amount, rule.currency)}, starting "
                f"{start.strftime('%B %d, %Y')}. [#{rule.id}]"
            )

        if action == "list":
            rules = (
                db.query(RecurringBudget)
                .filter(
                    RecurringBudget.user_id == user_id,
                    RecurringBudget.thread_id == thread_id,
                )
                .order_by(RecurringBudget.created_at.desc())
                .all()
            )

            if not rules:
                return "No recurring budgets have been set in this conversation."

            lines = []

            for rule in rules:
                status = "active" if rule.active else "paused"
                lines.append(
                    f"[#{rule.id}] {format_money(rule.amount, rule.currency)}, "
                    f"{rule.frequency}, next period starts "
                    f"{rule.next_period_start.strftime('%B %d, %Y')} — {status}"
                )

            return "\n".join(lines)

        target = _find_recurring_budget(db, user_id, thread_id, recurring_id)

        if not target:
            return (
                "No matching recurring budget was found in this "
                "conversation."
            )

        if action == "delete":
            db.delete(target)
            db.commit()
            return f"Deleted recurring budget [#{target.id}]."

        target.active = action == "resume"
        db.commit()

        return (
            f"Recurring budget [#{target.id}] "
            f"{'resumed' if target.active else 'paused'}."
        )

    finally:
        db.close()

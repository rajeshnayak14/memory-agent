CURRENCY_SYMBOLS = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
}

# The model extracts currency from natural language ("300 rupees", "50
# dollars") and may hand back a word instead of an ISO code — this must
# never reach the database as-is, since the column is only 3 characters
# wide and a longer string previously caused a hard 500 instead of a
# graceful fallback.
CURRENCY_ALIASES = {
    "rupee": "INR", "rupees": "INR", "inr": "INR", "₹": "INR",
    "dollar": "USD", "dollars": "USD", "usd": "USD", "$": "USD",
    "euro": "EUR", "euros": "EUR", "eur": "EUR", "€": "EUR",
    "pound": "GBP", "pounds": "GBP", "gbp": "GBP", "£": "GBP",
}


def format_money(amount: float, currency: str) -> str:
    symbol = CURRENCY_SYMBOLS.get(currency, currency + " ")
    return f"{symbol}{amount:.2f}"


def normalize_currency(value: str | None, default: str) -> str:
    """Map free-text currency input to a known ISO code, or fall back.

    Never returns anything outside CURRENCY_SYMBOLS's keys, so this is safe
    to write straight into the database's 3-character currency columns.
    """
    if not value:
        return default

    key = value.strip().lower()
    code = CURRENCY_ALIASES.get(key, value.strip().upper())

    return code if code in CURRENCY_SYMBOLS else default

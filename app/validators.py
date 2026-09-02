import re

PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$"
)

PASSWORD_REQUIREMENT = (
    "Password must be at least 8 characters and include an uppercase "
    "letter, a lowercase letter, a digit, and a special character."
)


def validate_password_strength(value: str) -> str:
    if not PASSWORD_PATTERN.match(value):
        raise ValueError(PASSWORD_REQUIREMENT)

    return value

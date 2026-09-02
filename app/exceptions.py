class AuthenticationError(Exception):
    pass


class MemoryNotFoundError(Exception):
    pass

class UserNotFoundError(Exception):
    pass

class DatabaseError(Exception):
    pass

class ResourceNotFoundError(Exception):
    """Generic 404 for the expense/budget/recurring REST resources."""
    pass

class EmailDeliveryError(Exception):
    """Raised when SMTP is unconfigured or a send attempt fails."""
    pass
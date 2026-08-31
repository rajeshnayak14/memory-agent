import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from app.exceptions import (
    AuthenticationError,
    MemoryNotFoundError,
    UserNotFoundError,
    DatabaseError,
    ResourceNotFoundError,
)


logger = logging.getLogger(__name__)


def authentication_error_handler(
    request: Request,
    exc: AuthenticationError,
):
    logger.warning(
        "Authentication error: path=%s detail=%s",
        request.url.path,
        str(exc),
    )

    return JSONResponse(
        status_code=401,
        content={"detail": str(exc)},
    )


def memory_not_found_handler(
    request: Request,
    exc: MemoryNotFoundError,
):
    logger.warning(
        "Memory not found: path=%s detail=%s",
        request.url.path,
        str(exc),
    )

    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)},
    )


def user_not_found_error_handler(
    request: Request,
    exc: UserNotFoundError,
):
    logger.warning(
        "User not found: path=%s detail=%s",
        request.url.path,
        str(exc),
    )

    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)},
    )


def resource_not_found_handler(
    request: Request,
    exc: ResourceNotFoundError,
):
    logger.warning(
        "Resource not found: path=%s detail=%s",
        request.url.path,
        str(exc),
    )

    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)},
    )


def database_error_handler(
    request: Request,
    exc: DatabaseError,
):
    logger.error(
        "Database error: path=%s detail=%s",
        request.url.path,
        str(exc),
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "A database error occurred.",
        },
    )
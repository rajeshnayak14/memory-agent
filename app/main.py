import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth_routes import router as auth_router
from app.routes.chat_routes import router as chat_router
from app.routes.memory_routes import router as memory_router
from app.routes.user_routes import router as user_router
from app.routes.expense_routes import router as expense_router
from app.routes.budget_routes import router as budget_router
from app.routes.recurring_routes import router as recurring_router
from app.routes.notification_routes import router as notification_router
from app.routes.category_routes import router as category_router
from app.routes.goal_routes import router as goal_router

from app.exceptions import (
    AuthenticationError,
    MemoryNotFoundError,
    UserNotFoundError,
    DatabaseError,
    ResourceNotFoundError,
)

from app.exception_handlers import (
    authentication_error_handler,
    memory_not_found_handler,
    user_not_found_error_handler,
    database_error_handler,
    resource_not_found_handler,
)

from app.logging_config import setup_logging

from app.routes.conversation_routes import (
    router as conversation_router,
)

setup_logging()

logger = logging.getLogger(__name__)


app = FastAPI(
    title="Memory Agent API",
    version="1.0.0",
    swagger_ui_parameters={
        "persistAuthorization": True,
    },
)


# CORS
#
# The regex always allows localhost/127.0.0.1 on any port, so local dev
# keeps working unmodified. FRONTEND_URL adds the deployed frontend's real
# origin(s) on top of that — set it in the host's environment variables,
# comma-separated if there's more than one (e.g. a Vercel preview + prod
# domain). Nothing needs to change here again after the first deploy.
_frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_URL", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_frontend_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
app.add_exception_handler(
    AuthenticationError,
    authentication_error_handler,
)

app.add_exception_handler(
    MemoryNotFoundError,
    memory_not_found_handler,
)

app.add_exception_handler(
    UserNotFoundError,
    user_not_found_error_handler,
)

app.add_exception_handler(
    DatabaseError,
    database_error_handler,
)

app.add_exception_handler(
    ResourceNotFoundError,
    resource_not_found_handler,
)


# Request logging middleware
@app.middleware("http")
async def log_requests(
    request: Request,
    call_next,
):
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time

    logger.info(
        "%s %s → %s (%.3fs)",
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )

    return response


# Routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(memory_router)
app.include_router(user_router)
app.include_router(conversation_router)
app.include_router(expense_router)
app.include_router(budget_router)
app.include_router(recurring_router)
app.include_router(notification_router)
app.include_router(category_router)
app.include_router(goal_router)


@app.get("/health")
def health():
    return {"status": "ok"}
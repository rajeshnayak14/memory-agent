import logging

from sqlalchemy.orm import Session

from app.model import AuditLog

logger = logging.getLogger(__name__)


def record_audit(
    db: Session,
    action: str,
    actor_id: int | None = None,
    actor_username: str | None = None,
    target_id: int | None = None,
    target_username: str | None = None,
    detail: str | None = None,
) -> None:
    """Best-effort audit trail write.

    Never allowed to break the caller's own action — a logging problem
    (or a stale session after the caller already committed/rolled back)
    must not surface as a failed login, registration, or admin action.
    """
    try:
        db.add(
            AuditLog(
                actor_user_id=actor_id,
                actor_username=actor_username,
                action=action,
                target_user_id=target_id,
                target_username=target_username,
                detail=detail,
            )
        )
        db.commit()
    except Exception:
        logger.exception("Failed to record audit log entry: action=%s", action)
        db.rollback()

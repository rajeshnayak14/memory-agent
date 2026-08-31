import logging

from fastapi import APIRouter, Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import DatabaseError, ResourceNotFoundError
from app.model import Notification
from app.schemas.notification_schemas import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    unread_only: bool = False,
    limit: int = 20,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        query = db.query(Notification).filter(
            Notification.user_id == int(user_id)
        )

        if unread_only:
            query = query.filter(Notification.read.is_(False))

        notifications = (
            query
            .order_by(Notification.created_at.desc())
            .limit(min(limit, 100))
            .all()
        )

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"notifications": notifications}


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        count = (
            db.query(Notification)
            .filter(
                Notification.user_id == int(user_id),
                Notification.read.is_(False),
            )
            .count()
        )

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"count": count}


@router.put("/read-all", response_model=NotificationListResponse)
def mark_all_read(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        notifications = (
            db.query(Notification)
            .filter(
                Notification.user_id == int(user_id),
                Notification.read.is_(False),
            )
            .all()
        )

        for notification in notifications:
            notification.read = True

        db.commit()

        all_notifications = (
            db.query(Notification)
            .filter(Notification.user_id == int(user_id))
            .order_by(Notification.created_at.desc())
            .limit(20)
            .all()
        )

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return {"notifications": all_notifications}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == int(user_id),
            )
            .first()
        )

        if not notification:
            raise ResourceNotFoundError("Notification not found")

        notification.read = True
        db.commit()
        db.refresh(notification)

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return notification

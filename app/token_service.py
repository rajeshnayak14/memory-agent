from datetime import datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.model import RevokedToken


def revoke_refresh_token(
    db: Session,
    token: str,
    expires_at: datetime,
):
    try:
        revoked_token = RevokedToken(
            token=token,
            expires_at=expires_at,
        )

        db.add(revoked_token)
        db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise


def is_token_revoked(
    db: Session,
    token: str,
):
    try:
        return (
            db.query(RevokedToken)
            .filter(RevokedToken.token == token)
            .first()
            is not None
        )

    except SQLAlchemyError:
        db.rollback()
        raise
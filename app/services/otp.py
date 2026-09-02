import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.auth import SECRET_KEY
from app.model import EmailOtp, User
from app.services.email import send_email

logger = logging.getLogger(__name__)

OTP_LENGTH = 6
OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 30
OTP_MAX_ATTEMPTS = 5


def _hash_code(code: str) -> str:
    # A 6-digit code has only 10^6 possibilities regardless of hash strength,
    # so this is basic at-rest hygiene (don't store the plaintext code), not
    # brute-force protection — that comes from expiry + attempt limiting.
    return hashlib.sha256(f"{SECRET_KEY}:{code}".encode()).hexdigest()


def create_and_send_otp(db: Session, user: User) -> None:
    if not user.email:
        raise ValueError("This account has no email address on file.")

    recent = (
        db.query(EmailOtp)
        .filter(
            EmailOtp.user_id == user.id,
            EmailOtp.consumed.is_(False),
        )
        .order_by(EmailOtp.created_at.desc())
        .first()
    )

    now = datetime.now(timezone.utc)

    if recent and recent.created_at > now - timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS):
        raise TimeoutError("Please wait before requesting another code.")

    code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"

    otp = EmailOtp(
        user_id=user.id,
        code_hash=_hash_code(code),
        expires_at=now + timedelta(minutes=OTP_TTL_MINUTES),
    )

    db.add(otp)
    db.commit()

    subject = "Your Mnemos verification code"
    body = (
        f"Your verification code is {code}.\n\n"
        f"It expires in {OTP_TTL_MINUTES} minutes. If you didn't request "
        f"this, you can safely ignore this email."
    )

    send_email(user.email, subject, body)

    logger.info("OTP sent: user_id=%s", user.id)


def verify_otp_code(db: Session, user_id: int, code: str) -> bool:
    otp = (
        db.query(EmailOtp)
        .filter(
            EmailOtp.user_id == user_id,
            EmailOtp.consumed.is_(False),
        )
        .order_by(EmailOtp.created_at.desc())
        .first()
    )

    if not otp:
        return False

    now = datetime.now(timezone.utc)

    if otp.expires_at < now or otp.attempts >= OTP_MAX_ATTEMPTS:
        return False

    if otp.code_hash != _hash_code(code):
        otp.attempts += 1
        db.commit()
        return False

    otp.consumed = True
    db.commit()

    return True

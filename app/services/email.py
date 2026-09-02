import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM", username)

    if not (host and username and password):
        raise RuntimeError(
            "SMTP is not configured — set SMTP_HOST, SMTP_USERNAME, and "
            "SMTP_PASSWORD."
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = to
    message.set_content(body)

    context = ssl.create_default_context()

    with smtplib.SMTP(host, port, timeout=10) as server:
        server.starttls(context=context)
        server.login(username, password)
        server.send_message(message)

    logger.info("Email sent: to=%s subject=%s", to, subject)

import logging
import os

import requests

logger = logging.getLogger(__name__)

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"


def send_email(to: str, subject: str, body: str) -> None:
    api_key = os.getenv("SENDGRID_API_KEY")

    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY is not set.")

    sender = os.getenv("SENDGRID_FROM")

    if not sender:
        raise RuntimeError("SENDGRID_FROM is not set.")

    response = requests.post(
        SENDGRID_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": sender, "name": "Mnemos"},
            "subject": subject,
            "content": [{"type": "text/plain", "value": body}],
        },
        timeout=10,
    )

    if response.status_code >= 400:
        raise RuntimeError(
            f"SendGrid API error ({response.status_code}): {response.text}"
        )

    logger.info("Email sent: to=%s subject=%s", to, subject)

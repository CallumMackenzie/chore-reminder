from __future__ import annotations

import os

from twilio.rest import Client


def send_sms(to_phone: str, body: str) -> str:
    account_sid = require_env("TWILIO_ACCOUNT_SID")
    auth_token = require_env("TWILIO_AUTH_TOKEN")
    from_phone = require_env("TWILIO_FROM_NUMBER")

    message = Client(account_sid, auth_token).messages.create(
        from_=from_phone,
        to=to_phone,
        body=body,
    )
    return message.sid


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"missing required environment variable: {name}")
    return value

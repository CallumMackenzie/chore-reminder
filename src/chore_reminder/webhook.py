from __future__ import annotations

from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, Response, request
from twilio.twiml.messaging_response import MessagingResponse

from chore_reminder.config import load_config
from chore_reminder.db import connect, find_open_reminder_for_phone, record_completion
from chore_reminder.messages import thank_you_message


def create_app(config_path: str | None = None) -> Flask:
    load_dotenv()
    app_config = load_config(config_path)
    conn = connect(app_config.database_path)
    app = Flask(__name__)

    @app.post("/sms")
    def sms_reply() -> Response:
        from_phone = request.form.get("From", "")
        body = request.form.get("Body", "").strip()
        response = MessagingResponse()

        if body.upper() != "Y":
            response.message("Reply Y when the chore is complete.")
            return Response(str(response), mimetype="application/xml")

        reminder = find_open_reminder_for_phone(conn, from_phone, datetime.now(timezone.utc))
        if not reminder:
            response.message("No open chore found for this number.")
            return Response(str(response), mimetype="application/xml")

        record_completion(
            conn,
            reminder,
            completed_by_phone=from_phone,
            raw_body=body,
            completed_at=datetime.now(timezone.utc),
        )
        response.message(thank_you_message())
        return Response(str(response), mimetype="application/xml")

    return app


app = create_app()

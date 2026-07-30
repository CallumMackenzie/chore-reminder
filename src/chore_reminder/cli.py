from __future__ import annotations

import argparse
import os
from datetime import datetime

from dotenv import load_dotenv

from chore_reminder.config import load_config
from chore_reminder.db import connect, has_completion, has_reminder, record_reminder
from chore_reminder.scheduler import due_occurrences, next_occurrences
from chore_reminder.twilio_sms import send_sms


def main() -> None:
    parser = argparse.ArgumentParser(prog="chore-reminder")
    parser.add_argument("--config", help="Path to tasks.json")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init-db", help="Create database tables")
    subparsers.add_parser("send-due", help="Send due chore reminders")

    upcoming = subparsers.add_parser("upcoming", help="Print upcoming chores")
    upcoming.add_argument("--count", type=int, default=10)

    args = parser.parse_args()
    load_dotenv()
    app_config = load_config(args.config)
    conn = connect(app_config.database_path)

    if args.command == "init-db":
        print(f"initialized {app_config.database_path}")
        return

    if args.command == "upcoming":
        for item in next_occurrences(app_config.data, count=args.count):
            print(f"{item.due_at.isoformat()} | {item.assignee_name} | {item.task}")
        return

    if args.command == "send-due":
        sent = 0
        skipped = 0
        for item in due_occurrences(app_config.data, now=datetime.now().astimezone()):
            if has_reminder(conn, item.reminder_id) or has_completion(conn, item.reminder_id):
                skipped += 1
                continue

            to_phone = os.getenv(item.phone_env)
            if not to_phone:
                raise RuntimeError(f"missing recipient phone env var: {item.phone_env}")

            twilio_sid = send_sms(to_phone, item.message)
            record_reminder(conn, item, to_phone=to_phone, twilio_sid=twilio_sid)
            sent += 1
        print(f"sent={sent} skipped={skipped}")
        return

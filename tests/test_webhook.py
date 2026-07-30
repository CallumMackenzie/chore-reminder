import json
from datetime import datetime, timedelta, timezone

from chore_reminder.db import connect
from chore_reminder.webhook import CONFIRMATION_MESSAGE, create_app


def test_y_reply_gets_good_roommate_confirmation(tmp_path):
    db_path = tmp_path / "chore-reminder.db"
    config_path = tmp_path / "tasks.json"
    config_path.write_text(
        json.dumps(
            {
                "timezone": "America/Vancouver",
                "database_path": str(db_path),
                "people": {"callum": {"display_name": "Callum", "phone": "+15555550101"}},
                "schedules": [
                    {
                        "id": "daily_chore_rotation",
                        "start_date": "2026-07-30",
                        "reminder_time": "08:00",
                        "interval": {"every": 1, "unit": "day"},
                        "due_window": {"amount": 1, "unit": "day"},
                        "rotation": [{"task_id": "callum_vacuums", "assignee": "callum", "task": "vacuum"}],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    now = datetime.now(timezone.utc)
    conn = connect(db_path)
    conn.execute(
        """
        insert into reminders (
          reminder_id, schedule_id, occurrence_index, task_id, assignee_id,
          due_at, due_by, sent_at, to_phone, twilio_sid
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "daily_chore_rotation:0",
            "daily_chore_rotation",
            0,
            "callum_vacuums",
            "callum",
            now.isoformat(),
            (now + timedelta(days=1)).isoformat(),
            now.isoformat(),
            "+15555550101",
            "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        ),
    )
    conn.commit()

    app = create_app(str(config_path))
    response = app.test_client().post("/sms", data={"From": "+15555550101", "Body": "Y"})

    assert response.status_code == 200
    assert CONFIRMATION_MESSAGE in response.text

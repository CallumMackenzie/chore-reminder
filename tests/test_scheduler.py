from datetime import datetime
from zoneinfo import ZoneInfo

from chore_reminder.scheduler import due_occurrences, next_occurrences


CONFIG = {
    "timezone": "America/Vancouver",
    "people": {
        "max": {"display_name": "Max", "phone_env": "MAX_PHONE_NUMBER"},
        "callum": {"display_name": "Callum", "phone_env": "CALLUM_PHONE_NUMBER"},
    },
    "schedules": [
        {
            "id": "daily_chore_rotation",
            "start_date": "2026-07-30",
            "reminder_time": "08:00",
            "interval": {"every": 1, "unit": "day"},
            "due_window": {"amount": 1, "unit": "day"},
            "rotation": [
                {"task_id": "max_vacuums", "assignee": "max", "task": "vacuum"},
                {"task_id": "max_cleans_counters", "assignee": "max", "task": "clean counters"},
                {"task_id": "callum_vacuums", "assignee": "callum", "task": "vacuum"},
                {"task_id": "callum_cleans_counters", "assignee": "callum", "task": "clean counters"},
            ],
        }
    ],
}


def test_due_occurrence_for_first_day():
    now = datetime(2026, 7, 30, 8, 1, tzinfo=ZoneInfo("America/Vancouver"))
    occurrences = due_occurrences(CONFIG, now=now)

    assert len(occurrences) == 1
    assert occurrences[0].assignee_name == "Max"
    assert occurrences[0].task == "vacuum"


def test_rotation_advances_daily():
    now = datetime(2026, 8, 2, 8, 1, tzinfo=ZoneInfo("America/Vancouver"))
    occurrences = due_occurrences(CONFIG, now=now)

    latest = occurrences[-1]
    assert latest.assignee_name == "Callum"
    assert latest.task == "clean counters"


def test_upcoming_starts_after_now():
    now = datetime(2026, 7, 30, 9, 0, tzinfo=ZoneInfo("America/Vancouver"))
    upcoming = next_occurrences(CONFIG, count=2, now=now)

    assert upcoming[0].due_at.date().isoformat() == "2026-07-31"
    assert upcoming[0].task == "clean counters"

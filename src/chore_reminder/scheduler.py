from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from chore_reminder.messages import good_morning_message


@dataclass(frozen=True)
class Occurrence:
    schedule_id: str
    occurrence_index: int
    task_id: str
    assignee_id: str
    assignee_name: str
    phone: str | None
    task: str
    due_at: datetime
    due_by: datetime
    message: str

    @property
    def reminder_id(self) -> str:
        return f"{self.schedule_id}:{self.occurrence_index}"


def due_occurrences(config: dict, now: datetime | None = None) -> list[Occurrence]:
    tz = ZoneInfo(config.get("timezone", "America/Vancouver"))
    now = now.astimezone(tz) if now else datetime.now(tz)
    lookback_days = int(config.get("lookback_days", 14))
    occurrences: list[Occurrence] = []

    for schedule in config["schedules"]:
        start_date = date.fromisoformat(schedule["start_date"])
        interval = schedule["interval"]
        due_window = schedule["due_window"]
        reminder_time = time.fromisoformat(schedule["reminder_time"])

        first_index = max(0, _index_at_or_before(start_date, now.date() - timedelta(days=lookback_days), interval))
        last_index = _index_at_or_before(start_date, now.date(), interval)

        for index in range(first_index, last_index + 1):
            due_date = _add_interval(start_date, interval, index)
            due_at = datetime.combine(due_date, reminder_time, tzinfo=tz)
            due_by = _due_by(due_at, due_window)
            if due_at <= now <= due_by:
                rotation_item = schedule["rotation"][index % len(schedule["rotation"])]
                person = config["people"][rotation_item["assignee"]]
                message_template = schedule.get(
                    "message_template",
                    "{assignee}, today's chore is: {task}. Reply Y when done.",
                )
                task_message = message_template.format(
                    assignee=person["display_name"],
                    task=rotation_item["task"],
                    due_at=due_at.isoformat(),
                    due_by=due_by.isoformat(),
                )
                occurrences.append(
                    Occurrence(
                        schedule_id=schedule["id"],
                        occurrence_index=index,
                        task_id=rotation_item["task_id"],
                        assignee_id=rotation_item["assignee"],
                        assignee_name=person["display_name"],
                        phone=_person_phone(person),
                        task=rotation_item["task"],
                        due_at=due_at,
                        due_by=due_by,
                        message=f"{good_morning_message()} {task_message}",
                    )
                )

    return sorted(occurrences, key=lambda item: item.due_at)


def next_occurrences(config: dict, count: int = 10, now: datetime | None = None) -> list[Occurrence]:
    tz = ZoneInfo(config.get("timezone", "America/Vancouver"))
    now = now.astimezone(tz) if now else datetime.now(tz)
    found: list[Occurrence] = []
    horizon_days = max(400, count * 40)

    for schedule in config["schedules"]:
        start_date = date.fromisoformat(schedule["start_date"])
        interval = schedule["interval"]
        reminder_time = time.fromisoformat(schedule["reminder_time"])
        start_index = max(0, _index_at_or_before(start_date, now.date(), interval))

        for index in range(start_index, start_index + horizon_days):
            due_date = _add_interval(start_date, interval, index)
            due_at = datetime.combine(due_date, reminder_time, tzinfo=tz)
            if due_at <= now:
                continue
            rotation_item = schedule["rotation"][index % len(schedule["rotation"])]
            person = config["people"][rotation_item["assignee"]]
            found.append(
                Occurrence(
                    schedule_id=schedule["id"],
                    occurrence_index=index,
                    task_id=rotation_item["task_id"],
                    assignee_id=rotation_item["assignee"],
                    assignee_name=person["display_name"],
                    phone=_person_phone(person),
                    task=rotation_item["task"],
                    due_at=due_at,
                    due_by=_due_by(due_at, schedule["due_window"]),
                    message="",
                )
            )
            if len(found) >= count:
                break

    return sorted(found, key=lambda item: item.due_at)[:count]


def _person_phone(person: dict) -> str | None:
    phone = person.get("phone")
    return phone if phone else None


def _index_at_or_before(start: date, target: date, interval: dict) -> int:
    if target < start:
        return 0
    every = int(interval["every"])
    if interval["unit"] == "day":
        return (target - start).days // every

    months = (target.year - start.year) * 12 + target.month - start.month
    return max(0, months // every)


def _add_interval(start: date, interval: dict, index: int) -> date:
    every = int(interval["every"])
    if interval["unit"] == "day":
        return start + timedelta(days=every * index)
    return _add_months(start, every * index)


def _due_by(due_at: datetime, due_window: dict) -> datetime:
    amount = int(due_window["amount"])
    if due_window["unit"] == "day":
        return due_at + timedelta(days=amount)
    return datetime.combine(_add_months(due_at.date(), amount), due_at.time(), due_at.tzinfo)


def _add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, _days_in_month(year, month))
    return date(year, month, day)


def _days_in_month(year: int, month: int) -> int:
    return monthrange(year, month)[1]

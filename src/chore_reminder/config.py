from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class AppConfig:
    path: Path
    data: dict[str, Any]

    @property
    def timezone(self) -> str:
        return self.data.get("timezone", "America/Vancouver")

    @property
    def database_path(self) -> Path:
        value = os.getenv("CHORE_REMINDER_DB_PATH") or self.data.get("database_path")
        if not value:
            value = "./data/chore-reminder.db"
        db_path = Path(value)
        if not db_path.is_absolute():
            db_path = self.path.parent.parent / db_path
        return db_path


def load_config(path: str | None = None) -> AppConfig:
    config_path = Path(path or os.getenv("CHORE_REMINDER_CONFIG", "./config/tasks.json"))
    if not config_path.is_absolute():
        config_path = Path.cwd() / config_path

    with config_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    validate_config(data)
    return AppConfig(path=config_path, data=data)


def validate_config(data: dict[str, Any]) -> None:
    people = data.get("people")
    schedules = data.get("schedules")
    if not isinstance(people, dict) or not people:
        raise ValueError("config requires a non-empty people object")
    if not isinstance(schedules, list) or not schedules:
        raise ValueError("config requires a non-empty schedules array")

    for schedule in schedules:
        for key in ("id", "start_date", "reminder_time", "interval", "due_window", "rotation"):
            if key not in schedule:
                raise ValueError(f"schedule missing required key: {key}")
        if schedule["interval"]["unit"] not in {"day", "month"}:
            raise ValueError("interval.unit must be day or month")
        if schedule["due_window"]["unit"] not in {"day", "month"}:
            raise ValueError("due_window.unit must be day or month")
        if not schedule["rotation"]:
            raise ValueError("schedule rotation cannot be empty")
        for item in schedule["rotation"]:
            if item["assignee"] not in people:
                raise ValueError(f"unknown assignee: {item['assignee']}")
    for person_id, person in people.items():
        if not person.get("phone"):
            raise ValueError(f"person {person_id} requires phone")

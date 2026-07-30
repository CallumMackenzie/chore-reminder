from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from chore_reminder.scheduler import Occurrence


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        create table if not exists reminders (
          reminder_id text primary key,
          schedule_id text not null,
          occurrence_index integer not null,
          task_id text not null,
          assignee_id text not null,
          due_at text not null,
          due_by text not null,
          sent_at text not null,
          to_phone text not null,
          twilio_sid text
        );

        create table if not exists completions (
          id integer primary key autoincrement,
          reminder_id text not null references reminders(reminder_id),
          schedule_id text not null,
          occurrence_index integer not null,
          task_id text not null,
          assignee_id text not null,
          completed_by_phone text not null,
          completed_at text not null,
          raw_body text not null,
          unique(reminder_id)
        );
        """
    )
    conn.commit()


def has_reminder(conn: sqlite3.Connection, reminder_id: str) -> bool:
    row = conn.execute("select 1 from reminders where reminder_id = ?", (reminder_id,)).fetchone()
    return row is not None


def has_completion(conn: sqlite3.Connection, reminder_id: str) -> bool:
    row = conn.execute("select 1 from completions where reminder_id = ?", (reminder_id,)).fetchone()
    return row is not None


def record_reminder(
    conn: sqlite3.Connection,
    occurrence: Occurrence,
    to_phone: str,
    twilio_sid: str | None,
    sent_at: datetime | None = None,
) -> None:
    sent_at = sent_at or datetime.now(timezone.utc)
    conn.execute(
        """
        insert or ignore into reminders (
          reminder_id, schedule_id, occurrence_index, task_id, assignee_id,
          due_at, due_by, sent_at, to_phone, twilio_sid
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            occurrence.reminder_id,
            occurrence.schedule_id,
            occurrence.occurrence_index,
            occurrence.task_id,
            occurrence.assignee_id,
            occurrence.due_at.isoformat(),
            occurrence.due_by.isoformat(),
            sent_at.isoformat(),
            to_phone,
            twilio_sid,
        ),
    )
    conn.commit()


def find_open_reminder_for_phone(conn: sqlite3.Connection, from_phone: str, now: datetime) -> dict[str, Any] | None:
    rows = conn.execute(
        """
        select r.*
        from reminders r
        left join completions c on c.reminder_id = r.reminder_id
        where r.to_phone = ?
          and c.id is null
        order by datetime(r.due_at) desc
        """,
        (from_phone,),
    ).fetchall()

    for row in rows:
        reminder = dict(row)
        due_by = datetime.fromisoformat(reminder["due_by"])
        if due_by >= now.astimezone(due_by.tzinfo):
            return reminder
    return None


def record_completion(
    conn: sqlite3.Connection,
    reminder: dict[str, Any],
    completed_by_phone: str,
    raw_body: str,
    completed_at: datetime,
) -> None:
    conn.execute(
        """
        insert or ignore into completions (
          reminder_id, schedule_id, occurrence_index, task_id, assignee_id,
          completed_by_phone, completed_at, raw_body
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            reminder["reminder_id"],
            reminder["schedule_id"],
            reminder["occurrence_index"],
            reminder["task_id"],
            reminder["assignee_id"],
            completed_by_phone,
            completed_at.isoformat(),
            raw_body,
        ),
    )
    conn.commit()

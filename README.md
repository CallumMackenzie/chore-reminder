# chore-reminder

SMS chore reminders for a rotating household task list.

## Project Overview

This project sends native SMS reminders through Twilio, records each reminder locally, and records a completion when the assignee replies `Y`.

The first configured rotation is:

1. Max vacuums
2. Max cleans counters
3. Callum vacuums
4. Callum cleans counters

Each item is one day in the rotation, starting from `start_date` in `config/tasks.json`.

## Planning Notes

- `config/tasks.json` owns the people, phone-number environment variable names, task rotations, intervals, due windows, and reminder time.
- `.env` owns secrets and private phone numbers.
- `send-due` is safe for cron because it records sent reminders and will not resend the same occurrence.
- Replies require a Twilio Messaging webhook pointed at `POST /sms`.
- The local database is a Turso/libSQL-compatible SQLite file by default at `./data/chore-reminder.db`.
- The scheduler supports `day` and `month` intervals, so the same project can handle daily chores, weekly chores with `{"every": 7, "unit": "day"}`, or monthly reminders with `{"every": 1, "unit": "month"}`.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
```

Edit `.env` with:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `CALLUM_PHONE_NUMBER`
- `MAX_PHONE_NUMBER`

Then initialize the database:

```bash
chore-reminder init-db
```

## Sending Reminders

Run once manually:

```bash
chore-reminder send-due
```

Cron for the default daily 8 AM wake-up. Use the absolute path to this repo on whichever machine is running it:

```cron
0 8 * * * /absolute/path/to/chore-reminder/scripts/send-due.sh >> /absolute/path/to/chore-reminder/logs/cron.log 2>&1
```

The app still supports daily or monthly intervals. With a daily 8 AM cron, keep each schedule's `reminder_time` at `08:00`; the app will decide whether a daily, weekly-style, or monthly task is due that morning.

The wrapper script resolves the project directory from its own location, so the same cron command shape works on Linux or macOS as long as cron uses an absolute path.

## Receiving `Y` Replies

Run the webhook app:

```bash
scripts/webhook.sh
```

Expose it with a tunnel or deploy it somewhere reachable, then set your Twilio number's incoming message webhook to:

```text
https://your-public-url.example/sms
```

## Inspect Upcoming Tasks

```bash
chore-reminder upcoming --count 10
```

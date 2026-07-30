#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

cd "$PROJECT_DIR"

if [ ! -x ".venv/bin/flask" ]; then
  echo "Missing .venv/bin/flask. Run setup from README.md first." >&2
  exit 1
fi

exec .venv/bin/flask --app chore_reminder.webhook run --host 0.0.0.0 --port "${PORT:-8080}"

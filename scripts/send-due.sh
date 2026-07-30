#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

cd "$PROJECT_DIR"

if [ ! -x ".venv/bin/chore-reminder" ]; then
  echo "Missing .venv/bin/chore-reminder. Run setup from README.md first." >&2
  exit 1
fi

exec .venv/bin/chore-reminder send-due

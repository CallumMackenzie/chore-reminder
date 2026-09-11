#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
  echo "Usage: scripts/set-firebase-secrets.sh <firebase-project-id>" >&2
  exit 1
fi

firebase functions:secrets:set TWILIO_ACCOUNT_SID --project "$PROJECT_ID"
firebase functions:secrets:set TWILIO_API_KEY_SID --project "$PROJECT_ID"
firebase functions:secrets:set TWILIO_API_KEY_SECRET --project "$PROJECT_ID"
firebase functions:secrets:set TWILIO_FROM_NUMBER --project "$PROJECT_ID"
firebase functions:secrets:set CHORE_API_TOKEN --project "$PROJECT_ID"

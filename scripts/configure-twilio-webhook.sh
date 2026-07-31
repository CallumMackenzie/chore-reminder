#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-}"
TWILIO_PHONE_NUMBER_SID="${2:-${TWILIO_PHONE_NUMBER_SID:-}}"

if [ -z "$PROJECT_ID" ] || [ -z "$TWILIO_PHONE_NUMBER_SID" ]; then
  echo "Usage: scripts/configure-twilio-webhook.sh <firebase-project-id> <twilio-phone-number-sid>" >&2
  echo "Or set TWILIO_PHONE_NUMBER_SID." >&2
  exit 1
fi

if ! command -v twilio >/dev/null 2>&1; then
  echo "Missing Twilio CLI. Install it or update the webhook manually in the Twilio console." >&2
  exit 1
fi

WEBHOOK_URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net/smsWebhook"

twilio api:core:incoming-phone-numbers:update "$TWILIO_PHONE_NUMBER_SID" \
  --sms-url "$WEBHOOK_URL" \
  --sms-method POST

echo "Twilio SMS webhook set to: $WEBHOOK_URL"

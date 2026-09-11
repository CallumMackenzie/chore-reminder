#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-}"
TWILIO_PHONE_NUMBER_SID="${2:-${TWILIO_PHONE_NUMBER_SID:-}}"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: scripts/configure-twilio-webhook.sh <firebase-project-id> [twilio-phone-number-sid]" >&2
  echo "Or set TWILIO_PHONE_NUMBER_SID / ~/.twilio." >&2
  exit 1
fi

WEBHOOK_URL="${WEBHOOK_URL:-}"
if [ -z "$WEBHOOK_URL" ] && command -v gcloud >/dev/null 2>&1; then
  WEBHOOK_URL="$(gcloud functions describe smsWebhook \
    --gen2 \
    --region us-central1 \
    --project "$PROJECT_ID" \
    --format='value(serviceConfig.uri)' 2>/dev/null || true)"
fi
if [ -z "$WEBHOOK_URL" ]; then
  WEBHOOK_URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net/smsWebhook"
fi

if command -v twilio >/dev/null 2>&1; then
  twilio api:core:incoming-phone-numbers:update "$TWILIO_PHONE_NUMBER_SID" \
    --sms-url "$WEBHOOK_URL" \
    --sms-method POST
else
  if [ ! -f "$HOME/.twilio" ]; then
    echo "Missing Twilio CLI and ~/.twilio." >&2
    exit 1
  fi

  TEMP_ENV="$(mktemp)"
  node - "$TWILIO_PHONE_NUMBER_SID" "$TEMP_ENV" <<'NODE'
const cp = require("child_process");
const fs = require("fs");

const explicitPhoneNumberSid = process.argv[2];
const outputPath = process.argv[3];
const raw = fs.readFileSync(`${process.env.HOME}/.twilio`, "utf8");
const local = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map((line) => {
  const idx = line.indexOf("=");
  return [line.slice(0, idx), line.slice(idx + 1)];
}));

const apiKeySid = local.TWILIO_ACCOUNT_SID;
const apiKeySecret = local.TWILIO_CLIENT_SECRET;
const phoneNumberSid = explicitPhoneNumberSid || local.TWILIO_SENDER_SID;
if (!apiKeySid || !apiKeySecret || !phoneNumberSid) {
  throw new Error("~/.twilio requires TWILIO_ACCOUNT_SID, TWILIO_CLIENT_SECRET, and TWILIO_SENDER_SID");
}

const accountsRaw = cp.execFileSync(
  "curl",
  ["-sS", "-u", `${apiKeySid}:${apiKeySecret}`, "https://api.twilio.com/2010-04-01/Accounts.json"],
  { encoding: "utf8" },
);
const accountSid = (JSON.parse(accountsRaw).accounts || []).find((account) => account.sid?.startsWith("AC"))?.sid;
if (!accountSid) throw new Error("Unable to resolve AC account SID");

fs.writeFileSync(outputPath, [
  `ACCOUNT_SID=${accountSid}`,
  `API_KEY_SID=${apiKeySid}`,
  `API_KEY_SECRET=${apiKeySecret}`,
  `PHONE_NUMBER_SID=${phoneNumberSid}`,
].join("\n"));
NODE

  set -a
  . "$TEMP_ENV"
  set +a

  curl -sS -u "$API_KEY_SID:$API_KEY_SECRET" \
    -X POST "https://api.twilio.com/2010-04-01/Accounts/$ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_NUMBER_SID.json" \
    --data-urlencode "SmsUrl=$WEBHOOK_URL" \
    --data-urlencode "SmsMethod=POST" >/dev/null

  rm -f "$TEMP_ENV"
fi

echo "Twilio SMS webhook set to: $WEBHOOK_URL"

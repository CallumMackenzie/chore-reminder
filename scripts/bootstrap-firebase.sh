#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-callum-chore-reminder}"
DISPLAY_NAME="${FIREBASE_DISPLAY_NAME:-Chore Reminder}"
FIRESTORE_LOCATION="${FIRESTORE_LOCATION:-nam5}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd firebase
require_cmd node
require_cmd npm

cd "$ROOT_DIR"

if ! firebase projects:list --json | grep -q "\"projectId\": \"$PROJECT_ID\""; then
  firebase projects:create "$PROJECT_ID" --display-name "$DISPLAY_NAME"
fi

cat > .firebaserc <<JSON
{
  "projects": {
    "default": "$PROJECT_ID"
  }
}
JSON

FIRESTORE_APIS=(
  firestore.googleapis.com
)

BILLING_REQUIRED_APIS=(
  artifactregistry.googleapis.com
  cloudbuild.googleapis.com
  cloudfunctions.googleapis.com
  cloudscheduler.googleapis.com
  eventarc.googleapis.com
  run.googleapis.com
  secretmanager.googleapis.com
)

BILLING_PENDING=0

if command -v gcloud >/dev/null 2>&1 && [ -n "$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null)" ]; then
  gcloud services enable "${FIRESTORE_APIS[@]}" --project "$PROJECT_ID"
  if ! gcloud services enable "${BILLING_REQUIRED_APIS[@]}" --project "$PROJECT_ID"; then
    BILLING_PENDING=1
  fi
else
  cat <<EOF
Firebase project exists and .firebaserc has been written, but gcloud is not authenticated.

Authenticate gcloud before rerunning this script:
  gcloud auth login
  scripts/bootstrap-firebase.sh $PROJECT_ID

Or enable these APIs manually:
  https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=$PROJECT_ID
  https://console.developers.google.com/apis/api/cloudfunctions.googleapis.com/overview?project=$PROJECT_ID
  https://console.developers.google.com/apis/api/cloudscheduler.googleapis.com/overview?project=$PROJECT_ID
  https://console.developers.google.com/apis/api/cloudbuild.googleapis.com/overview?project=$PROJECT_ID
  https://console.developers.google.com/apis/api/artifactregistry.googleapis.com/overview?project=$PROJECT_ID
  https://console.developers.google.com/apis/api/run.googleapis.com/overview?project=$PROJECT_ID
  https://console.developers.google.com/apis/api/eventarc.googleapis.com/overview?project=$PROJECT_ID
  https://console.developers.google.com/apis/api/secretmanager.googleapis.com/overview?project=$PROJECT_ID
EOF
  exit 1
fi

if ! firebase firestore:databases:list --project "$PROJECT_ID" --json | grep -q '"name": ".*/databases/(default)"'; then
  firebase firestore:databases:create "(default)" \
    --project "$PROJECT_ID" \
    --location "$FIRESTORE_LOCATION" \
    --delete-protection DISABLED \
    --point-in-time-recovery DISABLED
fi

npm --prefix functions install
npm --prefix functions run build
npm --prefix functions test

firebase deploy --project "$PROJECT_ID" --only firestore:rules

cat <<EOF

Firebase project is prepared: $PROJECT_ID

EOF

if [ "$BILLING_PENDING" -eq 1 ]; then
  cat <<EOF
Firestore is ready and rules are deployed.

Billing still needs to be enabled before deploying functions/secrets:
  https://console.firebase.google.com/project/$PROJECT_ID/usage/details

After billing is enabled, run:
  scripts/set-firebase-secrets.sh $PROJECT_ID
  firebase deploy --project $PROJECT_ID
EOF
else
  cat <<EOF
Billing-required APIs are enabled too.

Next run:
  scripts/set-firebase-secrets.sh $PROJECT_ID
  firebase deploy --project $PROJECT_ID
EOF
fi

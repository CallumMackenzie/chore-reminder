# chore-reminder

Firebase + Twilio SMS chore reminders for a rotating household task list.

## Project Overview

This project sends native SMS reminders through Twilio, records reminders/completions in Firestore, and records a completion when the assignee replies `Y`.
Daily task messages are prefixed with a random good-morning style opener, and completion replies are picked from a random thank-you message bank.

The first configured rotation is:

1. Callum vacuums
2. Callum cleans counters
3. Max vacuums
4. Max cleans counters

Each item is one day in the rotation, starting from `startDate` in `functions/config/tasks.json`.

## Planning Notes

- `functions/config/tasks.json` owns local household config: people, phone numbers, task rotations, intervals, due windows, and reminder time.
- `functions/.env` owns Twilio settings only.
- The scheduled Firebase function is safe to run daily because it records sent reminders and will not resend the same occurrence.
- Replies require a Twilio Messaging webhook pointed at the deployed `smsWebhook` HTTPS function.
- Firestore stores `reminders` and `completions`.
- The scheduler supports `day` and `month` intervals, so the same project can handle daily chores, weekly-style chores with `{"every": 7, "unit": "day"}`, or monthly reminders with `{"every": 1, "unit": "month"}`.

## Setup

```bash
npm install -g firebase-tools
cp .firebaserc.example .firebaserc
cp functions/.env.example functions/.env
cp functions/config/tasks.example.json functions/config/tasks.json
cd functions
npm install
npm test
npm run build
```

Edit `.firebaserc` with your Firebase project ID.

For deployment, Twilio credentials are stored as Firebase function secrets:

```bash
scripts/set-firebase-secrets.sh YOUR_PROJECT_ID
```

Edit `functions/config/tasks.json` with the local household phone numbers. This file is ignored by git. Leave a person's `phone` blank to skip their reminders for now.

## Local Verification

```bash
cd functions
npm test
npm run build
```

## Sending Reminders

The deployed scheduled function runs daily at 8 AM Vancouver time:

```ts
schedule: "0 8 * * *"
timeZone: "America/Vancouver"
```

The app still supports daily or monthly intervals. With a daily 8 AM scheduler, keep each schedule's `reminderTime` at `08:00`; the app will decide whether a daily, weekly-style, or monthly task is due that morning.

## Receiving `Y` Replies

After deploy, set your Twilio number's incoming message webhook to the `smsWebhook` URL:

```text
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/smsWebhook
```

## Deploy

```bash
scripts/bootstrap-firebase.sh callum-chore-reminder
scripts/set-firebase-secrets.sh callum-chore-reminder
firebase deploy --project callum-chore-reminder
```

After functions deploy, configure the Twilio webhook:

```bash
scripts/configure-twilio-webhook.sh callum-chore-reminder TWILIO_PHONE_NUMBER_SID
```

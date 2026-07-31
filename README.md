# chore-reminder

Firebase + Twilio SMS chore reminders for a rotating household task list.

## Project Overview

This project sends native SMS reminders through Twilio, records reminders/completions in Firestore, and records a completion when the assignee replies `Y`.
Daily task messages are prefixed with a random good-morning style opener, and completion replies are picked from a random thank-you message bank.

The first configured rotation is:

1. Max vacuums
2. Max cleans counters
3. Callum vacuums
4. Callum cleans counters

Each item is one day in the rotation, starting from `start_date` in `config/tasks.json`.

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

Edit `functions/.env` with:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

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
firebase deploy
```

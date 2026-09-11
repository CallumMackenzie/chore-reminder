# chore-reminder

Firebase + Twilio SMS chore reminders for a rotating household task list.

## Project Overview

This project sends native SMS reminders through Twilio, records reminders/completions in Firestore, and records a completion when the assignee replies `Y`.
Daily task messages are prefixed with a random good-morning style opener, and completion replies are picked from a random thank-you message bank.

The first configured rotation is:

1. Callum vacuums
2. Max vacuums
3. Amelia vacuums
4. Callum cleans counters
5. Max cleans counters
6. Amelia cleans counters

Each item is one day in the rotation, starting from `startDate` in `firebase/functions/config/tasks.json`.

Firebase Functions, Firestore configuration, and deployment scripts live under `firebase/`. An iOS app can be added alongside that directory later.

## Planning Notes

- `firebase/functions/config/tasks.json` owns local household config: people, phone numbers, task rotations, intervals, due windows, and reminder time.
- `firebase/functions/.env` owns Twilio settings only.
- The scheduled Firebase function is safe to run daily because it records sent reminders and will not resend the same occurrence.
- Replies require a Twilio Messaging webhook pointed at the deployed `smsWebhook` HTTPS function.
- Firestore stores `reminders` and `completions`.
- The scheduler supports `day` and `month` intervals, so the same project can handle daily chores, weekly-style chores with `{"every": 7, "unit": "day"}`, or monthly reminders with `{"every": 1, "unit": "month"}`.

## Setup

```bash
npm install -g firebase-tools
cp firebase/.firebaserc.example firebase/.firebaserc
cp firebase/functions/.env.example firebase/functions/.env
cp firebase/functions/config/tasks.example.json firebase/functions/config/tasks.json
npm --prefix firebase/functions install
npm --prefix firebase/functions test
npm --prefix firebase/functions run build
```

Edit `firebase/.firebaserc` with your Firebase project ID.

For deployment, Twilio credentials are stored as Firebase function secrets:

```bash
firebase/scripts/set-firebase-secrets.sh YOUR_PROJECT_ID
```

The deployed app expects:

- `TWILIO_ACCOUNT_SID` - the real `AC...` Twilio account SID
- `TWILIO_API_KEY_SID` - the `SK...` API key SID
- `TWILIO_API_KEY_SECRET` - the API key secret
- `TWILIO_FROM_NUMBER` - the Twilio SMS number in E.164 format

Edit `firebase/functions/config/tasks.json` with the local household phone numbers. This file is ignored by git. Leave a person's `phone` blank to skip their reminders for now.

## Local Verification

```bash
npm --prefix firebase/functions test
npm --prefix firebase/functions run build
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
firebase/scripts/bootstrap-firebase.sh callum-chore-reminder
firebase/scripts/set-firebase-secrets.sh callum-chore-reminder
firebase deploy --config firebase/firebase.json --project callum-chore-reminder
```

After functions deploy, configure the Twilio webhook:

```bash
firebase/scripts/configure-twilio-webhook.sh callum-chore-reminder TWILIO_PHONE_NUMBER_SID
```

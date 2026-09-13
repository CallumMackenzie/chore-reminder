# chore-reminder

Firebase + Twilio SMS chore reminders for a rotating household task list.

## Project Overview

This project sends native SMS reminders through Twilio, records reminders/outcomes in Firestore, and records a completion when the assignee replies `Y` or a skip when they reply `S`/`SKIP`. If multiple chores are due, replies use a number such as `Y1` or `S2`.
Daily task messages are prefixed with a random good-morning style opener, and completion replies are picked from a random thank-you message bank.

Each configured rotation item is one interval in the schedule, starting from `startDate` in a JSON file under `firebase/functions/config/`. Each non-example JSON file represents one household. Household names, phone numbers, and exact assignments belong only in those ignored local config files.

Firebase Functions, Firestore configuration, and deployment scripts live under `firebase/`. The SwiftUI client lives under `chore-reminder-ios/`.

## Planning Notes

- `firebase/functions/config/*.json` owns local household configs: one file per household, containing its people, phone numbers, task rotations, intervals, due windows, and reminder time. Example files are ignored by the runtime.
- `firebase/functions/.env` owns Twilio settings only.
- The scheduled Firebase function is safe to run daily because it records sent reminders and will not resend the same occurrence.
- Replies require a Twilio Messaging webhook pointed at the deployed `smsWebhook` HTTPS function.
- Firestore stores `reminders` and `completions`.
- After login, the token-authenticated `choreApi` returns today, the next 5 days, and the previous 3 days for only the matched household, without exposing phone numbers.
- App updates are limited server-side to chores scheduled for the current Vancouver calendar day.
- The scheduler supports `day` and `month` intervals, so the same project can handle daily chores, weekly-style chores with `{"every": 7, "unit": "day"}`, or monthly reminders with `{"every": 1, "unit": "month"}`.
- Monthly schedules may set `startAssignee` to begin with a particular person and continue through the declared rotation from that position.

## Setup

```bash
npm install -g firebase-tools
cp firebase/.firebaserc.example firebase/.firebaserc
cp firebase/functions/.env.example firebase/functions/.env
cp firebase/functions/config/tasks.example.json firebase/functions/config/tasks.json
# Add more household files, for example firebase/functions/config/sirus-zoe.json.
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
- `CHORE_API_TOKEN` - the bearer token bundled into the iOS app

Edit `firebase/functions/config/tasks.json` with the local household phone numbers. Add another uniquely named JSON file for each additional household. All non-example JSON files in the directory are loaded and ignored by git. Schedule IDs and phone numbers must be unique across households. Leave a person's `phone` blank to skip their reminders for now.

## Local Verification

```bash
npm --prefix firebase/functions test
npm --prefix firebase/functions run build
xcodebuild -project chore-reminder-ios/chore-reminder.xcodeproj -scheme chore-reminder \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' build
```

## Sending Reminders

The deployed scheduled function runs daily at 8 AM Vancouver time:

```ts
schedule: "0 8 * * *"
timeZone: "America/Vancouver"
```

The app still supports daily or monthly intervals. With a daily 8 AM scheduler, keep each schedule's `reminderTime` at `08:00`; the app will decide whether a daily, weekly-style, or monthly task is due that morning.

## Chore API and iOS App

`POST /choreApi/login` matches a configured household phone number and returns its household ID, user ID, and display name. The household ID is the config filename without `.json`. `GET /choreApi?householdId=...` returns only that household's current chore snapshot. `POST /choreApi/outcome` accepts the household ID, `reminderId`, user ID, and a status of `completed` or `skipped`; past, future, and non-owner updates are rejected.

Copy `chore-reminder-ios/chore-reminder/APIConfig.example.plist` to `APIConfig.plist`, set the deployed function URL and the same token stored as `CHORE_API_TOKEN`, then build the Xcode project. The real plist is ignored by Git but included in the app bundle.

The iOS app asks for a phone number once, stores the matching user identity in SwiftData, and only offers same-day actions for that user's chores. The bundled bearer token is suitable for this private household app, but it can be extracted from an installed application. Phone matching identifies a household member but does not verify possession; use verified authentication or App Attest before distributing the app beyond trusted devices.

## Receiving SMS Replies

After deploy, set your Twilio number's incoming message webhook to the `smsWebhook` URL:

```text
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/smsWebhook
```

## Deploy

```bash
firebase/scripts/bootstrap-firebase.sh YOUR_PROJECT_ID
firebase/scripts/set-firebase-secrets.sh YOUR_PROJECT_ID
firebase deploy --config firebase/firebase.json --project YOUR_PROJECT_ID
```

After functions deploy, configure the Twilio webhook:

```bash
firebase/scripts/configure-twilio-webhook.sh YOUR_PROJECT_ID TWILIO_PHONE_NUMBER_SID
```

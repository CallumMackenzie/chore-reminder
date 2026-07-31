import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { loadConfig } from "./config";
import { thankYouMessage } from "./messages";
import { dueOccurrences } from "./scheduler";
import { FirestoreReminderStore } from "./store";
import { sendSms } from "./twilioSms";

initializeApp();

const twilioAccountSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioAuthToken = defineSecret("TWILIO_AUTH_TOKEN");
const twilioFromNumber = defineSecret("TWILIO_FROM_NUMBER");
const twilioSecrets = [twilioAccountSid, twilioAuthToken, twilioFromNumber];

export const smsWebhook = onRequest({ region: "us-central1", secrets: twilioSecrets }, async (request, response) => {
  const fromPhone = String(request.body?.From ?? "");
  const body = String(request.body?.Body ?? "").trim();

  response.set("Content-Type", "application/xml");

  if (body.toUpperCase() !== "Y") {
    response.status(200).send(twiml("Reply Y when the chore is complete."));
    return;
  }

  const store = new FirestoreReminderStore();
  const reminder = await store.findOpenReminderForPhone(fromPhone);
  if (!reminder) {
    response.status(200).send(twiml("No open chore found for this number."));
    return;
  }

  await store.recordCompletion(reminder, fromPhone, body);
  response.status(200).send(twiml(thankYouMessage()));
});

export const dailyChores = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "America/Vancouver",
    region: "us-central1",
    secrets: twilioSecrets,
  },
  async () => {
    const config = loadConfig();
    const store = new FirestoreReminderStore();

    for (const occurrence of dueOccurrences(config)) {
      if (!occurrence.phone) continue;
      if (await store.hasReminder(occurrence.reminderId)) continue;
      if (await store.hasCompletion(occurrence.reminderId)) continue;

      const twilioSid = await sendSms(occurrence.phone, occurrence.message, {
        accountSid: twilioAccountSid.value(),
        authToken: twilioAuthToken.value(),
        fromPhone: twilioFromNumber.value(),
      });
      await store.recordReminder(occurrence, twilioSid);
    }
  },
);

function twiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

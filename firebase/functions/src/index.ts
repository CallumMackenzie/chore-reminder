import { initializeApp } from "firebase-admin/app";
import { timingSafeEqual } from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { buildChoreSnapshot, findIdentityByPhone, findTodayOccurrence, parseOutcomeStatus, parseSmsOutcome } from "./choreApi";
import { loadConfig } from "./config";
import { invalidCompletionMessage, noOpenReminderMessage, skippedMessage, thankYouMessage } from "./messages";
import { dueOccurrences } from "./scheduler";
import { FirestoreReminderStore } from "./store";
import { sendSms } from "./twilioSms";

initializeApp();

const twilioAccountSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioApiKeySid = defineSecret("TWILIO_API_KEY_SID");
const twilioApiKeySecret = defineSecret("TWILIO_API_KEY_SECRET");
const twilioFromNumber = defineSecret("TWILIO_FROM_NUMBER");
const choreApiToken = defineSecret("CHORE_API_TOKEN");
const twilioSecrets = [twilioAccountSid, twilioApiKeySid, twilioApiKeySecret, twilioFromNumber];

export const smsWebhook = onRequest({ region: "us-central1", invoker: "public", secrets: twilioSecrets }, async (request, response) => {
  const fromPhone = String(request.body?.From ?? "");
  const body = String(request.body?.Body ?? "").trim();
  const outcome = parseSmsOutcome(body);

  response.set("Content-Type", "application/xml");

  if (!outcome) {
    response.status(200).send(twiml(invalidCompletionMessage()));
    return;
  }

  const store = new FirestoreReminderStore();
  const reminder = await store.findOpenReminderForPhone(fromPhone);
  if (!reminder) {
    response.status(200).send(twiml(noOpenReminderMessage()));
    return;
  }

  await store.recordSmsOutcome(reminder, outcome, fromPhone, body);
  response.status(200).send(twiml(outcome === "skipped" ? skippedMessage() : thankYouMessage()));
});

export const choreApi = onRequest(
  { region: "us-central1", invoker: "public", secrets: [choreApiToken] },
  async (request, response) => {
    response.set("Cache-Control", "no-store");
    response.set("Content-Type", "application/json");

    if (!hasBearerToken(request.get("Authorization"), choreApiToken.value())) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const config = loadConfig();
    const store = new FirestoreReminderStore();
    const now = new Date();
    const path = request.path.replace(/\/+$/, "") || "/";

    if (request.method === "GET" && path === "/") {
      response.status(200).json(await buildChoreSnapshot(config, store, now));
      return;
    }

    if (request.method === "POST" && path === "/login") {
      const identity = findIdentityByPhone(config, typeof request.body?.phone === "string" ? request.body.phone : "");
      if (!identity) {
        response.status(404).json({ error: "No household member matches that phone number" });
        return;
      }
      response.status(200).json(identity);
      return;
    }

    if (request.method === "POST" && path === "/outcome") {
      const reminderId = typeof request.body?.reminderId === "string" ? request.body.reminderId : "";
      const userId = typeof request.body?.userId === "string" ? request.body.userId : "";
      const status = parseOutcomeStatus(request.body?.status);
      if (!reminderId || !userId || !status) {
        response.status(400).json({ error: "reminderId, userId, and a valid status are required" });
        return;
      }

      const occurrence = findTodayOccurrence(config, reminderId, now);
      if (!occurrence) {
        response.status(403).json({ error: "Only today's chores can be updated" });
        return;
      }

      const storedReminder = (await store.getReminderMetadata([reminderId])).get(reminderId);
      const assignedUserId = storedReminder?.assigneeId ?? occurrence.assigneeId;
      if (assignedUserId !== userId) {
        response.status(403).json({ error: "Only the assigned person can update this chore" });
        return;
      }

      await store.recordAppOutcome(occurrence, status);
      response.status(200).json(await buildChoreSnapshot(config, store, now));
      return;
    }

    response.status(404).json({ error: "Not found" });
  },
);

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
        apiKeySid: twilioApiKeySid.value(),
        apiKeySecret: twilioApiKeySecret.value(),
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

function hasBearerToken(authorization: string | undefined, expectedToken: string): boolean {
  if (!authorization?.startsWith("Bearer ") || !expectedToken) return false;
  const supplied = Buffer.from(authorization.slice("Bearer ".length), "utf8");
  const expected = Buffer.from(expectedToken, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

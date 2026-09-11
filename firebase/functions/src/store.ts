import { getFirestore, Timestamp } from "firebase-admin/firestore";

import type { ChoreOutcomeStatus, Occurrence, StoredChoreOutcome, StoredReminderMetadata } from "./types";

export class FirestoreReminderStore {
  private readonly db = getFirestore();

  async hasReminder(reminderId: string): Promise<boolean> {
    const snapshot = await this.db.collection("reminders").doc(reminderId).get();
    return snapshot.exists;
  }

  async hasCompletion(reminderId: string): Promise<boolean> {
    const snapshot = await this.db.collection("completions").doc(reminderId).get();
    return snapshot.exists;
  }

  async getOutcomes(reminderIds: string[]): Promise<Map<string, StoredChoreOutcome>> {
    if (reminderIds.length === 0) return new Map();

    const uniqueIds = [...new Set(reminderIds)];
    const references = uniqueIds.map((id) => this.db.collection("completions").doc(id));
    const snapshots = await this.db.getAll(...references);
    const outcomes = new Map<string, StoredChoreOutcome>();

    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;
      const data = snapshot.data() ?? {};
      const resolvedTimestamp = data.resolvedAt ?? data.completedAt;
      outcomes.set(snapshot.id, {
        status: data.status === "skipped" ? "skipped" : "completed",
        resolvedAt: resolvedTimestamp instanceof Timestamp ? resolvedTimestamp.toDate() : undefined,
      });
    }

    return outcomes;
  }

  async getReminderMetadata(reminderIds: string[]): Promise<Map<string, StoredReminderMetadata>> {
    if (reminderIds.length === 0) return new Map();

    const uniqueIds = [...new Set(reminderIds)];
    const references = uniqueIds.map((id) => this.db.collection("reminders").doc(id));
    const snapshots = await this.db.getAll(...references);
    const reminders = new Map<string, StoredReminderMetadata>();

    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;
      const data = snapshot.data() ?? {};
      if (typeof data.taskId !== "string" || typeof data.assigneeId !== "string") continue;
      reminders.set(snapshot.id, {
        taskId: data.taskId,
        assigneeId: data.assigneeId,
        task: typeof data.task === "string" ? data.task : undefined,
        assigneeName: typeof data.assigneeName === "string" ? data.assigneeName : undefined,
      });
    }

    return reminders;
  }

  async recordReminder(occurrence: Occurrence, twilioSid?: string): Promise<void> {
    await this.db.collection("reminders").doc(occurrence.reminderId).set({
      reminderId: occurrence.reminderId,
      scheduleId: occurrence.scheduleId,
      occurrenceIndex: occurrence.occurrenceIndex,
      taskId: occurrence.taskId,
      assigneeId: occurrence.assigneeId,
      task: occurrence.task,
      assigneeName: occurrence.assigneeName,
      dueAt: Timestamp.fromDate(occurrence.dueAt),
      dueBy: Timestamp.fromDate(occurrence.dueBy),
      sentAt: Timestamp.now(),
      toPhone: occurrence.phone,
      twilioSid: twilioSid ?? null,
    });
  }

  async findOpenReminderForPhone(fromPhone: string, now = new Date()): Promise<FirebaseFirestore.DocumentData | null> {
    const snapshot = await this.db
      .collection("reminders")
      .where("toPhone", "==", fromPhone)
      .where("dueBy", ">=", Timestamp.fromDate(now))
      .orderBy("dueBy", "asc")
      .limit(10)
      .get();

    for (const doc of snapshot.docs) {
      const completion = await this.db.collection("completions").doc(doc.id).get();
      if (!completion.exists) {
        return doc.data();
      }
    }

    return null;
  }

  async recordSmsOutcome(
    reminder: FirebaseFirestore.DocumentData,
    status: ChoreOutcomeStatus,
    completedByPhone: string,
    rawBody: string,
  ): Promise<void> {
    const resolvedAt = Timestamp.now();
    await this.db.collection("completions").doc(reminder.reminderId).set({
      reminderId: reminder.reminderId,
      scheduleId: reminder.scheduleId,
      occurrenceIndex: reminder.occurrenceIndex,
      taskId: reminder.taskId,
      assigneeId: reminder.assigneeId,
      status,
      source: "sms",
      completedByPhone,
      resolvedAt,
      ...(status === "completed" ? { completedAt: resolvedAt } : { skippedAt: resolvedAt }),
      rawBody,
    });
  }

  async recordAppOutcome(occurrence: Occurrence, status: ChoreOutcomeStatus): Promise<void> {
    const resolvedAt = Timestamp.now();
    const reminder = await this.db.collection("reminders").doc(occurrence.reminderId).get();
    const reminderData = reminder.data();
    await this.db.collection("completions").doc(occurrence.reminderId).set({
      reminderId: occurrence.reminderId,
      scheduleId: occurrence.scheduleId,
      occurrenceIndex: occurrence.occurrenceIndex,
      taskId: reminderData?.taskId ?? occurrence.taskId,
      assigneeId: reminderData?.assigneeId ?? occurrence.assigneeId,
      status,
      source: "ios",
      resolvedAt,
      ...(status === "completed" ? { completedAt: resolvedAt } : { skippedAt: resolvedAt }),
    });
  }
}

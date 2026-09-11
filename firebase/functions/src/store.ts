import { getFirestore, Timestamp } from "firebase-admin/firestore";

import type { Occurrence } from "./types";

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

  async recordReminder(occurrence: Occurrence, twilioSid?: string): Promise<void> {
    await this.db.collection("reminders").doc(occurrence.reminderId).set({
      reminderId: occurrence.reminderId,
      scheduleId: occurrence.scheduleId,
      occurrenceIndex: occurrence.occurrenceIndex,
      taskId: occurrence.taskId,
      assigneeId: occurrence.assigneeId,
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

  async recordCompletion(reminder: FirebaseFirestore.DocumentData, completedByPhone: string, rawBody: string): Promise<void> {
    await this.db.collection("completions").doc(reminder.reminderId).set({
      reminderId: reminder.reminderId,
      scheduleId: reminder.scheduleId,
      occurrenceIndex: reminder.occurrenceIndex,
      taskId: reminder.taskId,
      assigneeId: reminder.assigneeId,
      completedByPhone,
      completedAt: Timestamp.now(),
      rawBody,
    });
  }
}

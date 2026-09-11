import { occurrencesBetween, relativeLocalDayRange } from "./scheduler";
import type {
  AppConfig,
  ChoreApiItem,
  ChoreApiIdentity,
  ChoreApiSnapshot,
  ChoreDisplayStatus,
  ChoreOutcomeStatus,
  Occurrence,
  StoredChoreOutcome,
  StoredReminderMetadata,
} from "./types";

export interface ChoreOutcomeReader {
  getOutcomes(reminderIds: string[]): Promise<Map<string, StoredChoreOutcome>>;
  getReminderMetadata(reminderIds: string[]): Promise<Map<string, StoredReminderMetadata>>;
}

export interface SmsChoreOption {
  occurrence: Occurrence;
  outcome?: ChoreOutcomeStatus;
}

export async function buildChoreSnapshot(
  config: AppConfig,
  outcomes: ChoreOutcomeReader,
  now = new Date(),
): Promise<ChoreApiSnapshot> {
  const historyRange = relativeLocalDayRange(now, config.timezone, -3, 0);
  const todayRange = relativeLocalDayRange(now, config.timezone, 0, 1);
  const upcomingRange = relativeLocalDayRange(now, config.timezone, 1, 6);

  const history = occurrencesBetween(config, historyRange.startsAt, historyRange.endsAt);
  const today = occurrencesBetween(config, todayRange.startsAt, todayRange.endsAt);
  const upcoming = occurrencesBetween(config, upcomingRange.startsAt, upcomingRange.endsAt);
  const all = [...history, ...today, ...upcoming];
  const reminderIds = all.map((item) => item.reminderId);
  const [storedOutcomes, storedReminders] = await Promise.all([
    outcomes.getOutcomes(reminderIds),
    outcomes.getReminderMetadata(reminderIds),
  ]);

  const item = (occurrence: Occurrence, status: ChoreDisplayStatus, actionable: boolean): ChoreApiItem =>
    apiItem(config, occurrence, storedReminders.get(occurrence.reminderId), status, actionable);

  return {
    generatedAt: now.toISOString(),
    timezone: config.timezone,
    today: today.map((occurrence) => item(occurrence, storedOutcomes.get(occurrence.reminderId)?.status ?? "pending", true)),
    upcoming: upcoming.map((occurrence) => item(occurrence, storedOutcomes.get(occurrence.reminderId)?.status ?? "pending", false)),
    history: history
      .map((occurrence) => item(occurrence, storedOutcomes.get(occurrence.reminderId)?.status ?? "notCompleted", false))
      .sort((left, right) => right.dueAt.localeCompare(left.dueAt)),
  };
}

export function findTodayOccurrence(config: AppConfig, reminderId: string, now = new Date()): Occurrence | null {
  const range = relativeLocalDayRange(now, config.timezone, 0, 1);
  return occurrencesBetween(config, range.startsAt, range.endsAt)
    .find((item) => item.reminderId === reminderId) ?? null;
}

export async function findTodaysChoresForPhone(
  config: AppConfig,
  data: ChoreOutcomeReader,
  phone: string,
  now = new Date(),
): Promise<SmsChoreOption[]> {
  const identity = findIdentityByPhone(config, phone);
  if (!identity) return [];

  const range = relativeLocalDayRange(now, config.timezone, 0, 1);
  const occurrences = occurrencesBetween(config, range.startsAt, range.endsAt);
  const ids = occurrences.map((item) => item.reminderId);
  const [outcomes, reminders] = await Promise.all([
    data.getOutcomes(ids),
    data.getReminderMetadata(ids),
  ]);

  return occurrences.flatMap((occurrence): SmsChoreOption[] => {
    const stored = reminders.get(occurrence.reminderId);
    const assigneeId = stored?.assigneeId ?? occurrence.assigneeId;
    if (assigneeId !== identity.userId) return [];
    const taskId = stored?.taskId ?? occurrence.taskId;
    const configuredTask = config.schedules.flatMap((schedule) => schedule.rotation).find((item) => item.taskId === taskId)?.task;
    return [{
      occurrence: {
        ...occurrence,
        assigneeId,
        assigneeName: stored?.assigneeName ?? config.people[assigneeId]?.displayName ?? occurrence.assigneeName,
        taskId,
        task: stored?.task ?? configuredTask ?? occurrence.task,
      },
      outcome: outcomes.get(occurrence.reminderId)?.status,
    }];
  });
}

export function parseOutcomeStatus(value: unknown): ChoreOutcomeStatus | null {
  return value === "completed" || value === "skipped" ? value : null;
}

export function parseSmsOutcome(value: string): ChoreOutcomeStatus | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === "Y") return "completed";
  if (normalized === "S" || normalized === "SKIP") return "skipped";
  return null;
}

export function findIdentityByPhone(config: AppConfig, value: string): ChoreApiIdentity | null {
  const phone = normalizePhone(value);
  if (!phone) return null;
  const match = Object.entries(config.people).find(([, person]) => normalizePhone(person.phone ?? "") === phone);
  return match ? { userId: match[0], displayName: match[1].displayName } : null;
}

function normalizePhone(value: string): string | null {
  const digits = value.replaceAll(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function apiItem(
  config: AppConfig,
  occurrence: Occurrence,
  stored: StoredReminderMetadata | undefined,
  status: ChoreDisplayStatus,
  actionable: boolean,
): ChoreApiItem {
  const taskId = stored?.taskId ?? occurrence.taskId;
  const assigneeId = stored?.assigneeId ?? occurrence.assigneeId;
  const configuredTask = config.schedules.flatMap((schedule) => schedule.rotation).find((rotation) => rotation.taskId === taskId)?.task;
  return {
    reminderId: occurrence.reminderId,
    scheduleId: occurrence.scheduleId,
    taskId,
    assigneeId,
    assigneeName: stored?.assigneeName ?? config.people[assigneeId]?.displayName ?? occurrence.assigneeName,
    task: stored?.task ?? configuredTask ?? occurrence.task,
    dueAt: occurrence.dueAt.toISOString(),
    dueBy: occurrence.dueBy.toISOString(),
    status,
    actionable,
  };
}

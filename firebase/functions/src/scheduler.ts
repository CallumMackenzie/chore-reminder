import { goodMorningMessage } from "./messages";
import type { AppConfig, Occurrence } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function dueOccurrences(config: AppConfig, now = new Date()): Occurrence[] {
  const lookbackDays = config.lookbackDays ?? 14;
  const occurrences: Occurrence[] = [];

  for (const schedule of config.schedules) {
    const startDate = parseDate(schedule.startDate);
    const targetDate = localDateInTimezone(now, config.timezone);
    const firstIndex = Math.max(0, indexAtOrBefore(startDate, addDays(targetDate, -lookbackDays), schedule.interval));
    const lastIndex = indexAtOrBefore(startDate, targetDate, schedule.interval);

    for (let index = firstIndex; index <= lastIndex; index += 1) {
      const dueDate = addInterval(startDate, schedule.interval, index);
      const dueAt = zonedDateTime(dueDate, schedule.reminderTime, config.timezone);
      const dueBy = addDueWindow(dueAt, schedule.dueWindow);
      if (dueAt <= now && now <= dueBy) {
        const rotationItem = schedule.rotation[index % schedule.rotation.length];
        const person = config.people[rotationItem.assignee];
        const taskMessage = (schedule.messageTemplate ?? "{assignee}, today's chore: {task}. Text Y when handled fr.")
          .replaceAll("{assignee}", person.displayName)
          .replaceAll("{task}", rotationItem.task)
          .replaceAll("{due_at}", dueAt.toISOString())
          .replaceAll("{due_by}", dueBy.toISOString());

        occurrences.push({
          reminderId: `${schedule.id}:${index}`,
          scheduleId: schedule.id,
          occurrenceIndex: index,
          taskId: rotationItem.taskId,
          assigneeId: rotationItem.assignee,
          assigneeName: person.displayName,
          phone: person.phone || undefined,
          task: rotationItem.task,
          dueAt,
          dueBy,
          message: `${goodMorningMessage()} ${taskMessage}`,
        });
      }
    }
  }

  return occurrences.sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime());
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function localDateInTimezone(value: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day));
}

function zonedDateTime(date: Date, hhmm: string, timezone: string): Date {
  const [hour, minute] = hhmm.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute));
  const offsetMinutes = timezoneOffsetMinutes(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60 * 1000);
}

function timezoneOffsetMinutes(value: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  }).formatToParts(value);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function indexAtOrBefore(start: Date, target: Date, interval: { every: number; unit: "day" | "month" }): number {
  if (target < start) return 0;
  if (interval.unit === "day") {
    return Math.floor((target.getTime() - start.getTime()) / DAY_MS / interval.every);
  }
  const months = (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + target.getUTCMonth() - start.getUTCMonth();
  return Math.max(0, Math.floor(months / interval.every));
}

function addInterval(start: Date, interval: { every: number; unit: "day" | "month" }, index: number): Date {
  if (interval.unit === "day") {
    return addDays(start, interval.every * index);
  }
  return addMonths(start, interval.every * index);
}

function addDueWindow(dueAt: Date, dueWindow: { amount: number; unit: "day" | "month" }): Date {
  if (dueWindow.unit === "day") {
    return new Date(dueAt.getTime() + dueWindow.amount * DAY_MS);
  }
  return addMonths(dueAt, dueWindow.amount);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function addMonths(value: Date, months: number): Date {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

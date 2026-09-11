import type { ChoreOutcomeStatus, Occurrence } from "./types";
import type { SmsChoreOption } from "./choreApi";

export interface SmsCommand {
  status: ChoreOutcomeStatus;
  selection?: number;
}

export function parseSmsCommand(value: string): SmsCommand | null {
  const match = value.trim().toUpperCase().match(/^(Y|S|SKIP)(\d+)?$/);
  if (!match) return null;
  return {
    status: match[1] === "Y" ? "completed" : "skipped",
    selection: match[2] ? Number(match[2]) : undefined,
  };
}

export function selectSmsChore(options: SmsChoreOption[], command: SmsCommand): SmsChoreOption | null {
  if (command.selection !== undefined) {
    return options[command.selection - 1] ?? null;
  }
  const unresolved = options.filter((option) => option.outcome === undefined);
  return unresolved.length === 1 ? unresolved[0] : null;
}

export function currentChoresMessage(options: SmsChoreOption[]): string {
  if (options.length === 1) {
    const option = options[0];
    return `Today's chore: ${option.occurrence.task}${statusSuffix(option)}. Reply Y when handled or S to skip.`;
  }
  const list = options.map((option, index) => `${index + 1}) ${option.occurrence.task}${statusSuffix(option)}`).join("; ");
  const numbers = options.map((_, index) => index + 1).join("/");
  return `Today's chores: ${list}. Reply Y${numbers.replaceAll("/", "/Y")} to complete or S${numbers.replaceAll("/", "/S")} to skip.`;
}

export function reminderMessage(occurrences: Occurrence[]): string {
  if (occurrences.length === 1) return occurrences[0].message;
  const list = occurrences.map((occurrence, index) => `${index + 1}) ${occurrence.task}`).join("; ");
  const numbers = occurrences.map((_, index) => index + 1).join("/");
  return `${occurrences[0].assigneeName}, today's chores: ${list}. Reply Y${numbers.replaceAll("/", "/Y")} to complete or S${numbers.replaceAll("/", "/S")} to skip.`;
}

function statusSuffix(option: SmsChoreOption): string {
  if (option.outcome === "completed") return " [completed]";
  if (option.outcome === "skipped") return " [skipped]";
  return "";
}

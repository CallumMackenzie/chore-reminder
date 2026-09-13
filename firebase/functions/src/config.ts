import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";

import type { AppConfig, HouseholdConfig } from "./types";

export function loadConfigs(path = process.env.CHORE_REMINDER_CONFIG ?? join(__dirname, "..", "config")): HouseholdConfig[] {
  const paths = statSync(path).isDirectory()
    ? readdirSync(path)
      .filter((name) => name.endsWith(".json") && !name.endsWith(".example.json"))
      .sort()
      .map((name) => join(path, name))
    : [path];

  if (paths.length === 0) {
    throw new Error(`no household config files found in ${path}`);
  }

  const households = paths.map((configPath) => {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as AppConfig;
    validateConfig(config);
    return { id: basename(configPath, extname(configPath)), config };
  });
  validateHouseholds(households);
  return households;
}

export function validateConfig(config: AppConfig): void {
  if (!config.people || Object.keys(config.people).length === 0) {
    throw new Error("config requires people");
  }
  if (!config.schedules || config.schedules.length === 0) {
    throw new Error("config requires schedules");
  }

  for (const schedule of config.schedules) {
    if (!schedule.rotation.length) {
      throw new Error(`schedule ${schedule.id} requires rotation items`);
    }
    if (schedule.startAssignee && schedule.interval.unit !== "month") {
      throw new Error(`schedule ${schedule.id} can only use startAssignee with a monthly interval`);
    }
    if (schedule.startAssignee && !schedule.rotation.some((item) => item.assignee === schedule.startAssignee)) {
      throw new Error(`schedule ${schedule.id} startAssignee must be in its rotation`);
    }
    for (const item of schedule.rotation) {
      if (!config.people[item.assignee]) {
        throw new Error(`unknown assignee: ${item.assignee}`);
      }
    }
  }
}

export function validateHouseholds(households: HouseholdConfig[]): void {
  const scheduleIds = new Set<string>();
  const phones = new Map<string, string>();

  for (const household of households) {
    if (!/^[a-zA-Z0-9_-]+$/.test(household.id)) {
      throw new Error(`invalid household config filename: ${household.id}`);
    }
    for (const schedule of household.config.schedules) {
      if (scheduleIds.has(schedule.id)) {
        throw new Error(`duplicate schedule id across households: ${schedule.id}`);
      }
      scheduleIds.add(schedule.id);
    }
    for (const person of Object.values(household.config.people)) {
      const phone = normalizePhone(person.phone ?? "");
      if (!phone) continue;
      const previousHousehold = phones.get(phone);
      if (previousHousehold) {
        throw new Error(`phone number is configured in both ${previousHousehold} and ${household.id}`);
      }
      phones.set(phone, household.id);
    }
  }
}

function normalizePhone(value: string): string | null {
  const digits = value.replaceAll(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

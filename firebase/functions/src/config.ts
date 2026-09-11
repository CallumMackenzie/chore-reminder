import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { AppConfig } from "./types";

export function loadConfig(): AppConfig {
  const path = process.env.CHORE_REMINDER_CONFIG ?? join(__dirname, "..", "config", "tasks.json");
  const raw = readFileSync(path, "utf8");
  const config = JSON.parse(raw) as AppConfig;
  validateConfig(config);
  return config;
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

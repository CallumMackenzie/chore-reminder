import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfigs, validateConfig, validateHouseholds } from "./config";
import type { AppConfig, HouseholdConfig } from "./types";

const config: AppConfig = {
  timezone: "America/Vancouver",
  people: {
    callum: { displayName: "Callum" },
    amelia: { displayName: "Amelia" },
  },
  schedules: [{
    id: "monthly",
    startDate: "2026-09-12",
    startAssignee: "amelia",
    reminderTime: "08:00",
    interval: { every: 1, unit: "month" },
    dueWindow: { amount: 3, unit: "day" },
    rotation: [
      { taskId: "callum_task", assignee: "callum", task: "task" },
      { taskId: "amelia_task", assignee: "amelia", task: "task" },
    ],
  }],
};

describe("validateConfig", () => {
  it("accepts a monthly start assignee in the rotation", () => {
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("rejects a start assignee missing from the rotation", () => {
    expect(() => validateConfig({
      ...config,
      schedules: [{ ...config.schedules[0], startAssignee: "nobody" }],
    })).toThrow(/startAssignee must be in its rotation/);
  });

  it("rejects startAssignee on a non-monthly schedule", () => {
    expect(() => validateConfig({
      ...config,
      schedules: [{ ...config.schedules[0], interval: { every: 1, unit: "day" } }],
    })).toThrow(/only use startAssignee with a monthly interval/);
  });
});

describe("validateHouseholds", () => {
  const household = (id: string, scheduleId: string, phone: string): HouseholdConfig => ({
    id,
    config: {
      ...config,
      people: { callum: { displayName: "Callum", phone } },
      schedules: [{
        ...config.schedules[0],
        id: scheduleId,
        rotation: [{ taskId: `${id}_task`, assignee: "callum", task: "task" }],
      }],
    },
  });

  it("accepts separate households with unique schedules and phone numbers", () => {
    expect(() => validateHouseholds([
      household("first", "first_daily", "+15555550101"),
      household("second", "second_daily", "+15555550102"),
    ])).not.toThrow();
  });

  it("rejects reminder IDs that could collide across households", () => {
    expect(() => validateHouseholds([
      household("first", "daily", "+15555550101"),
      household("second", "daily", "+15555550102"),
    ])).toThrow(/duplicate schedule id/);
  });

  it("rejects a phone number shared by two households", () => {
    expect(() => validateHouseholds([
      household("first", "first_daily", "+1 (555) 555-0101"),
      household("second", "second_daily", "555-555-0101"),
    ])).toThrow(/configured in both/);
  });
});

describe("loadConfigs", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    temporaryDirectories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }));
  });

  it("loads every non-example JSON file as a separate household", () => {
    const directory = mkdtempSync(join(tmpdir(), "chore-reminder-config-"));
    temporaryDirectories.push(directory);
    const householdConfig = (scheduleId: string): AppConfig => ({
      ...config,
      schedules: [{ ...config.schedules[0], id: scheduleId }],
    });
    writeFileSync(join(directory, "first.json"), JSON.stringify(householdConfig("first_monthly")));
    writeFileSync(join(directory, "second.json"), JSON.stringify(householdConfig("second_monthly")));
    writeFileSync(join(directory, "tasks.example.json"), "not runtime JSON");

    expect(loadConfigs(directory).map((household) => household.id)).toEqual(["first", "second"]);
  });
});

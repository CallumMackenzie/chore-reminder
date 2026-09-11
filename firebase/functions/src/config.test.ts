import { describe, expect, it } from "vitest";

import { validateConfig } from "./config";
import type { AppConfig } from "./types";

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

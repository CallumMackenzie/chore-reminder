import { describe, expect, it } from "vitest";

import { dueOccurrences } from "./scheduler";
import type { AppConfig } from "./types";

const config: AppConfig = {
  timezone: "America/Vancouver",
  people: {
    max: { displayName: "Max", phone: "" },
    callum: { displayName: "Callum", phone: "+15555550101" },
  },
  schedules: [
    {
      id: "daily_chore_rotation",
      startDate: "2026-07-30",
      reminderTime: "08:00",
      interval: { every: 1, unit: "day" },
      dueWindow: { amount: 1, unit: "day" },
      rotation: [
        { taskId: "callum_vacuums", assignee: "callum", task: "vacuum" },
        { taskId: "callum_cleans_counters", assignee: "callum", task: "clean counters" },
        { taskId: "max_vacuums", assignee: "max", task: "vacuum" },
        { taskId: "max_cleans_counters", assignee: "max", task: "clean counters" },
      ],
    },
  ],
};

describe("dueOccurrences", () => {
  it("allows blank phone numbers so senders can skip them", () => {
    const now = new Date("2026-07-30T15:01:00.000Z");
    const occurrences = dueOccurrences(config, now);

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].assigneeName).toBe("Callum");
    expect(occurrences[0].phone).toBe("+15555550101");
  });

  it("advances the daily rotation", () => {
    const now = new Date("2026-08-01T15:01:00.000Z");
    const occurrences = dueOccurrences(config, now);

    expect(occurrences.at(-1)?.assigneeName).toBe("Max");
    expect(occurrences.at(-1)?.task).toBe("vacuum");
  });
});

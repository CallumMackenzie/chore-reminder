import { describe, expect, it } from "vitest";

import { dueOccurrences, occurrencesBetween, relativeLocalDayRange } from "./scheduler";
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

  it("rotates monthly chores and clamps month-end dates", () => {
    const monthlyConfig: AppConfig = {
      ...config,
      schedules: [{
        ...config.schedules[0],
        id: "monthly",
        startDate: "2026-01-31",
        interval: { every: 1, unit: "month" },
      }],
    };
    const range = relativeLocalDayRange(new Date("2026-02-28T18:00:00.000Z"), monthlyConfig.timezone, 0, 1);
    const occurrences = occurrencesBetween(monthlyConfig, range.startsAt, range.endsAt);

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].occurrenceIndex).toBe(1);
    expect(occurrences[0].dueAt.toISOString()).toBe("2026-02-28T16:00:00.000Z");
    expect(occurrences[0].assigneeName).toBe("Callum");
    expect(occurrences[0].task).toBe("clean counters");
  });

  it("starts a monthly rotation on the configured assignee and continues from there", () => {
    const monthlyConfig: AppConfig = {
      timezone: "America/Vancouver",
      people: config.people,
      schedules: [{
        id: "monthly_bathroom",
        startDate: "2026-09-12",
        startAssignee: "max",
        reminderTime: "08:00",
        interval: { every: 1, unit: "month" },
        dueWindow: { amount: 3, unit: "day" },
        rotation: [
          { taskId: "callum_bathroom", assignee: "callum", task: "deep-clean the bathroom" },
          { taskId: "max_bathroom", assignee: "max", task: "deep-clean the bathroom" },
        ],
      }],
    };
    const september = relativeLocalDayRange(new Date("2026-09-12T18:00:00.000Z"), monthlyConfig.timezone, 0, 1);
    const october = relativeLocalDayRange(new Date("2026-10-12T18:00:00.000Z"), monthlyConfig.timezone, 0, 1);

    expect(occurrencesBetween(monthlyConfig, september.startsAt, september.endsAt)[0].assigneeId).toBe("max");
    expect(occurrencesBetween(monthlyConfig, october.startsAt, october.endsAt)[0].assigneeId).toBe("callum");
  });
});

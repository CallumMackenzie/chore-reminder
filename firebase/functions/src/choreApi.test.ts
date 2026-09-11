import { describe, expect, it } from "vitest";

import { buildChoreSnapshot, findIdentityByPhone, findTodayOccurrence, parseOutcomeStatus, parseSmsOutcome } from "./choreApi";
import type { AppConfig, StoredChoreOutcome } from "./types";

const config: AppConfig = {
  timezone: "America/Vancouver",
  people: {
    callum: { displayName: "Callum" },
    max: { displayName: "Max" },
    amelia: { displayName: "Amelia Bowyer" },
  },
  schedules: [{
    id: "daily",
    startDate: "2026-09-08",
    reminderTime: "08:00",
    interval: { every: 1, unit: "day" },
    dueWindow: { amount: 1, unit: "day" },
    rotation: [
      { taskId: "callum_vacuum", assignee: "callum", task: "vacuum" },
      { taskId: "max_vacuum", assignee: "max", task: "vacuum" },
      { taskId: "amelia_vacuum", assignee: "amelia", task: "vacuum" },
    ],
  }],
};

describe("chore API domain", () => {
  it("returns three historical days, today, and upcoming chores with outcomes", async () => {
    const stored = new Map<string, StoredChoreOutcome>([
      ["daily:0", { status: "completed" }],
      ["daily:1", { status: "skipped" }],
    ]);
    const snapshot = await buildChoreSnapshot(config, {
      getOutcomes: async () => stored,
      getReminderMetadata: async () => new Map(),
    }, new Date("2026-09-10T18:00:00.000Z"));

    expect(snapshot.history.map((item) => item.status)).toEqual(["skipped", "completed"]);
    expect(snapshot.today).toHaveLength(1);
    expect(snapshot.today[0]).toMatchObject({ reminderId: "daily:2", status: "pending", actionable: true });
    expect(snapshot.upcoming).toHaveLength(5);
    expect(snapshot.upcoming[0]).toMatchObject({ reminderId: "daily:3", actionable: false });
  });

  it("prefers the assignee stored with a sent reminder after a rotation changes", async () => {
    const snapshot = await buildChoreSnapshot(config, {
      getOutcomes: async () => new Map(),
      getReminderMetadata: async () => new Map([[
        "daily:2",
        { taskId: "max_vacuum", assigneeId: "max" },
      ]]),
    }, new Date("2026-09-10T18:00:00.000Z"));

    expect(snapshot.today[0]).toMatchObject({ assigneeId: "max", assigneeName: "Max" });
  });

  it("only resolves an occurrence scheduled for the current local day", () => {
    const now = new Date("2026-09-10T18:00:00.000Z");
    expect(findTodayOccurrence(config, "daily:2", now)?.assigneeId).toBe("amelia");
    expect(findTodayOccurrence(config, "daily:3", now)).toBeNull();
    expect(findTodayOccurrence(config, "daily:1", now)).toBeNull();
  });

  it("parses supported app and SMS outcomes", () => {
    expect(parseOutcomeStatus("completed")).toBe("completed");
    expect(parseOutcomeStatus("skipped")).toBe("skipped");
    expect(parseOutcomeStatus("later")).toBeNull();
    expect(parseSmsOutcome("Y")).toBe("completed");
    expect(parseSmsOutcome("skip")).toBe("skipped");
    expect(parseSmsOutcome("no")).toBeNull();
  });

  it("identifies a configured household member from a normalized phone number", () => {
    const configured = {
      ...config,
      people: { ...config.people, amelia: { displayName: "Amelia", phone: "+12369781158" } },
    };
    expect(findIdentityByPhone(configured, "(236) 978-1158")).toEqual({ userId: "amelia", displayName: "Amelia" });
    expect(findIdentityByPhone(configured, "555-555-5555")).toBeNull();
  });
});

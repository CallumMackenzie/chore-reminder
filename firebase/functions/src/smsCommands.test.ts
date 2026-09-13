import { describe, expect, it } from "vitest";

import { currentChoresMessage, parseSmsCommand, reminderMessage, selectSmsChore } from "./smsCommands";
import type { Occurrence } from "./types";

const occurrence = (index: number, task: string): Occurrence => ({
  reminderId: `daily:${index}`,
  scheduleId: "daily",
  occurrenceIndex: index,
  taskId: `task-${index}`,
  assigneeId: "person",
  assigneeName: "Person",
  phone: "+15555550123",
  task,
  dueAt: new Date("2026-09-12T15:00:00.000Z"),
  dueBy: new Date("2026-09-13T15:00:00.000Z"),
  message: `Please ${task}. Reply Y when handled or S to skip.`,
});

describe("SMS commands", () => {
  it("parses complete and skip commands with optional selections", () => {
    expect(parseSmsCommand("Y")).toEqual({ status: "completed", selection: undefined });
    expect(parseSmsCommand("y2")).toEqual({ status: "completed", selection: 2 });
    expect(parseSmsCommand("S")).toEqual({ status: "skipped", selection: undefined });
    expect(parseSmsCommand("skip3")).toEqual({ status: "skipped", selection: 3 });
    expect(parseSmsCommand("yes")).toBeNull();
  });

  it("accepts an unnumbered command only when one unresolved chore remains", () => {
    const first = { occurrence: occurrence(0, "vacuum") };
    const second = { occurrence: occurrence(1, "clean counters") };
    const complete = { status: "completed" as const };

    expect(selectSmsChore([first], complete)).toBe(first);
    expect(selectSmsChore([first, second], complete)).toBeNull();
    expect(selectSmsChore([{ ...first, outcome: "completed" }, second], complete)).toBe(second);
  });

  it("keeps numbered selections stable when another chore is already resolved", () => {
    const first = { occurrence: occurrence(0, "vacuum"), outcome: "completed" as const };
    const second = { occurrence: occurrence(1, "clean counters") };
    expect(selectSmsChore([first, second], { status: "skipped", selection: 2 })).toBe(second);
  });

  it("shows numbered complete and skip commands for multiple chores", () => {
    const options = [
      { occurrence: occurrence(0, "vacuum") },
      { occurrence: occurrence(1, "clean counters") },
    ];
    expect(currentChoresMessage(options)).toContain("Y1/Y2");
    expect(currentChoresMessage(options)).toContain("S1/S2");
    const reminder = reminderMessage(options.map((option) => option.occurrence));
    expect(reminder).toContain("Collingclean");
    expect(reminder).toContain("1) vacuum; 2) clean counters");
  });
});

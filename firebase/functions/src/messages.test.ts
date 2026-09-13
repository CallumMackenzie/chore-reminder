import { describe, expect, it } from "vitest";

import {
  COMPLETION_ACKS,
  COMPLETION_TAGS,
  GOOD_MORNING_MESSAGES,
  INVALID_COMPLETION_MESSAGES,
  NO_OPEN_REMINDER_MESSAGES,
  SKIPPED_MESSAGES,
  THANK_YOU_MESSAGES,
} from "./messages";

const ALL_MESSAGES = [
  ...GOOD_MORNING_MESSAGES,
  ...COMPLETION_ACKS,
  ...COMPLETION_TAGS,
  ...INVALID_COMPLETION_MESSAGES,
  ...NO_OPEN_REMINDER_MESSAGES,
  ...SKIPPED_MESSAGES,
  ...THANK_YOU_MESSAGES,
];

describe("chore reminder intros", () => {
  it("introduces every reminder as Juan", () => {
    expect(GOOD_MORNING_MESSAGES).toHaveLength(40);
    expect(GOOD_MORNING_MESSAGES.every((message) => message.includes("Juan"))).toBe(true);
  });

  it("uses Juan Bot's abbreviated text style", () => {
    expect(ALL_MESSAGES.every((message) => !message.includes("—"))).toBe(true);
    expect(ALL_MESSAGES.every((message) => !/\b(?:you|your|with)\b/i.test(message))).toBe(true);
  });
});

describe("completion messages", () => {
  it("keeps a 200-compliment completion pool", () => {
    expect(THANK_YOU_MESSAGES).toHaveLength(200);
  });
});

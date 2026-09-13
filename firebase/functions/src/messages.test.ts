import { describe, expect, it } from "vitest";

import {
  GOOD_MORNING_MESSAGES,
  INVALID_COMPLETION_MESSAGES,
  NO_OPEN_REMINDER_MESSAGES,
  SKIPPED_MESSAGES,
  THANK_YOU_MESSAGES,
} from "./messages";

const ALL_MESSAGES = [
  ...GOOD_MORNING_MESSAGES,
  ...INVALID_COMPLETION_MESSAGES,
  ...NO_OPEN_REMINDER_MESSAGES,
  ...SKIPPED_MESSAGES,
  ...THANK_YOU_MESSAGES,
];

describe("chore reminder intros", () => {
  it("introduces every reminder as Collingclean", () => {
    expect(GOOD_MORNING_MESSAGES).toHaveLength(40);
    expect(GOOD_MORNING_MESSAGES.every((message) => message.includes("Collingclean"))).toBe(true);
  });

  it("uses Collingclean's abbreviated text style", () => {
    expect(ALL_MESSAGES.every((message) => !message.includes("—"))).toBe(true);
    expect(ALL_MESSAGES.every((message) => !/\b(?:you|your|with)\b/i.test(message))).toBe(true);
  });
});

describe("completion messages", () => {
  it("keeps a varied pool of concise completion replies", () => {
    expect(THANK_YOU_MESSAGES).toHaveLength(40);
    expect(THANK_YOU_MESSAGES.every((message) => message.length <= 40)).toBe(true);
  });
});

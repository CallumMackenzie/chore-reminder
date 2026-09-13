import { describe, expect, it } from "vitest";

import { GOOD_MORNING_MESSAGES, THANK_YOU_MESSAGES } from "./messages";

describe("chore reminder intros", () => {
  it("introduces every reminder as Juan", () => {
    expect(GOOD_MORNING_MESSAGES).toHaveLength(40);
    expect(GOOD_MORNING_MESSAGES.every((message) => message.includes("Juan"))).toBe(true);
  });
});

describe("completion messages", () => {
  it("keeps a 200-compliment completion pool", () => {
    expect(THANK_YOU_MESSAGES).toHaveLength(200);
  });
});

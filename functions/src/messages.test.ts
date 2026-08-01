import { describe, expect, it } from "vitest";

import { THANK_YOU_MESSAGES } from "./messages";

describe("completion messages", () => {
  it("keeps a 200-compliment completion pool", () => {
    expect(THANK_YOU_MESSAGES).toHaveLength(200);
  });
});

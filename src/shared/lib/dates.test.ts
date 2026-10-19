import { describe, expect, it } from "vitest";

import { formatDate } from "./dates";

describe("formatDate", () => {
  it("does not shift the calendar day", () => {
    expect(formatDate("2026-10-02")).toBe("Oct 2, 2026");
  });
});

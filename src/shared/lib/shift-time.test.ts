import { describe, expect, it } from "vitest";

import type { AgencyShift } from "@/contracts/shifts/types";

import { durationHours, formatEndsOn } from "./shift-time";

function shift(overrides: Partial<AgencyShift>): AgencyShift {
  return {
    id: "shift-x",
    role: "RN",
    date: "2026-10-02",
    startTime: "07:00",
    endTime: "19:00",
    status: "open",
    nurseName: null,
    ...overrides,
  };
}

describe("durationHours", () => {
  it("measures a day shift", () => {
    expect(durationHours({ startTime: "07:00", endTime: "19:00" })).toBe(12);
  });

  it("measures an overnight shift", () => {
    expect(durationHours({ startTime: "19:00", endTime: "07:00" })).toBe(12);
  });
});

describe("formatEndsOn", () => {
  it("names the following day for an overnight shift", () => {
    expect(formatEndsOn(shift({ date: "2026-10-02", startTime: "19:00", endTime: "07:00" }))).toBe("Oct 3");
  });

  it("rolls over a month end", () => {
    expect(formatEndsOn(shift({ date: "2026-10-31", startTime: "19:00", endTime: "07:00" }))).toBe("Nov 1");
  });

  it("is null for a same-day shift", () => {
    expect(formatEndsOn(shift({ startTime: "07:00", endTime: "19:00" }))).toBeNull();
  });
});

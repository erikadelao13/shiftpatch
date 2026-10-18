import { describe, expect, it } from "vitest";

import {
  durationHours,
  endsNextDay,
  formatDate,
  formatTimeRange,
  summarize,
} from "./schedule";
import type { AgencyShift } from "./types";

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

describe("formatTimeRange", () => {
  it("marks a shift that ends the next day", () => {
    const overnight = { startTime: "19:00", endTime: "07:00" };
    expect(endsNextDay(overnight)).toBe(true);
    expect(formatTimeRange(overnight)).toBe("19:00–07:00 (+1 day)");
  });

  it("leaves a same-day shift unmarked", () => {
    expect(formatTimeRange({ startTime: "07:00", endTime: "19:00" })).toBe("07:00–19:00");
  });
});

describe("formatDate", () => {
  it("does not shift the calendar day", () => {
    expect(formatDate("2026-10-02")).toBe("Oct 2, 2026");
  });
});

describe("summarize", () => {
  it("counts coverage and hours from open and filled shifts", () => {
    const summary = summarize([
      shift({ status: "open" }),
      shift({ status: "filled", nurseName: "Maria Lopez" }),
    ]);
    expect(summary).toEqual({ open: 1, filled: 1, coveragePercent: 50, scheduledHours: 12 });
  });

  it("has no coverage percentage without shifts", () => {
    expect(summarize([]).coveragePercent).toBeNull();
  });
});

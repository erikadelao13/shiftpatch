import { describe, expect, it } from "vitest";

import { formatHours, timesheetTotals, totalScheduledHours } from "./hours";
import type { TimesheetEntry } from "./types";

describe("formatHours", () => {
  it("shows whole hours without decimals", () => {
    expect(formatHours(12)).toBe("12h");
    expect(formatHours(0)).toBe("0h");
  });

  it("rounds partial hours to two decimals", () => {
    expect(formatHours(7.5)).toBe("7.5h");
    expect(formatHours(710 / 60)).toBe("11.83h");
  });
});

describe("totalScheduledHours", () => {
  it("adds day and overnight shifts", () => {
    expect(
      totalScheduledHours([
        { startTime: "07:00", endTime: "19:00" },
        { startTime: "19:00", endTime: "07:00" },
        { startTime: "07:30", endTime: "15:00" },
      ]),
    ).toBe(31.5);
  });

  it("is zero with no shifts", () => {
    expect(totalScheduledHours([])).toBe(0);
  });
});

function entry(overrides: Partial<TimesheetEntry>): TimesheetEntry {
  return {
    id: "shift-a",
    shiftId: "shift-a",
    role: "RN",
    agencyName: "Agency A",
    date: "2026-10-03",
    startTime: "07:00",
    endTime: "19:00",
    nurseName: "Maria Lopez",
    state: "assigned",
    ...overrides,
  };
}

describe("timesheetTotals", () => {
  it("leaves history rows out of the assigned count and scheduled hours", () => {
    expect(
      timesheetTotals([
        entry({ id: "c1", state: "cancelled" }),
        entry({ id: "c2", state: "no-show" }),
        entry({ id: "shift-a" }),
      ]),
    ).toEqual({ assigned: 1, history: 2, scheduledHours: 12 });
  });

  it("is zero with no entries", () => {
    expect(timesheetTotals([])).toEqual({ assigned: 0, history: 0, scheduledHours: 0 });
  });
});

import { describe, expect, it } from "vitest";

import { formatHours, totalScheduledHours } from "./hours";

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

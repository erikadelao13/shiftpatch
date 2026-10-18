import { describe, expect, it } from "vitest";

import { newShiftSchema, toFieldErrors } from "./schemas";

const valid = {
  role: "RN",
  date: "2026-10-05",
  startTime: "07:00",
  endTime: "19:00",
};

function errorsFor(input: unknown) {
  const result = newShiftSchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error);
}

describe("newShiftSchema", () => {
  it("accepts a valid shift", () => {
    expect(newShiftSchema.parse(valid)).toEqual(valid);
  });

  it("accepts an overnight shift", () => {
    expect(
      newShiftSchema.safeParse({ ...valid, startTime: "19:00", endTime: "07:00" }).success,
    ).toBe(true);
  });

  it("accepts a past date", () => {
    expect(newShiftSchema.safeParse({ ...valid, date: "2020-01-01" }).success).toBe(true);
  });

  it("rejects a start time equal to the end time on endTime", () => {
    const errors = errorsFor({ ...valid, endTime: "07:00" });
    expect(errors).toEqual({ endTime: "End time must differ from the start time." });
  });

  it.each(["24:00", "7:00", "07:60", "", "0700"])("rejects the time %j", (time) => {
    expect(errorsFor({ ...valid, startTime: time }).startTime).toBeDefined();
    expect(errorsFor({ ...valid, endTime: time }).endTime).toBeDefined();
  });

  it.each(["2026-02-30", "2026-13-01", "2026-2-3", ""])("rejects the date %j", (date) => {
    expect(errorsFor({ ...valid, date }).date).toBeDefined();
  });

  it("rejects a role other than RN or LPN", () => {
    expect(errorsFor({ ...valid, role: "CNA" }).role).toBeDefined();
  });

  it("reports every missing field", () => {
    expect(Object.keys(errorsFor({})).sort()).toEqual(["date", "endTime", "role", "startTime"]);
  });

  it("strips an agencyId from the body", () => {
    expect(newShiftSchema.parse({ ...valid, agencyId: "agency-b" })).toEqual(valid);
  });
});

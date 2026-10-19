import { describe, expect, it } from "vitest";

import { toCancelledShiftDTO, toDbCancellationReason, toShiftDTO, type ShiftRow } from "./shift-presenter";

const row: ShiftRow = {
  id: "shift-1",
  agencyId: "agency-a",
  agency: { name: "Sunrise Health Staffing" },
  role: "RN",
  date: new Date("2026-10-02T00:00:00.000Z"),
  startTime: "19:00",
  endTime: "07:00",
  status: "open",
  claimedById: null,
};

describe("toShiftDTO", () => {
  it("returns exactly the nine spec keys", () => {
    const extra = { ...row, createdAt: new Date(), secret: "x" };
    expect(Object.keys(toShiftDTO(extra)).sort()).toEqual(
      [
        "agencyId",
        "agencyName",
        "claimedBy",
        "date",
        "endTime",
        "id",
        "role",
        "startTime",
        "status",
      ].sort(),
    );
  });

  it("matches the spec for an open shift", () => {
    expect(toShiftDTO(row)).toEqual({
      id: "shift-1",
      agencyId: "agency-a",
      agencyName: "Sunrise Health Staffing",
      role: "RN",
      date: "2026-10-02",
      startTime: "19:00",
      endTime: "07:00",
      status: "open",
      claimedBy: null,
    });
  });

  it("reports the claiming nurse's id on a filled shift", () => {
    const filled = toShiftDTO({ ...row, status: "filled", claimedById: "nurse-1" });
    expect(filled.claimedBy).toBe("nurse-1");
  });

  it("keeps the calendar day of a date-only value at UTC midnight", () => {
    const first = toShiftDTO({ ...row, date: new Date("2026-01-01T00:00:00.000Z") });
    expect(first.date).toBe("2026-01-01");
  });
});

describe("toCancelledShiftDTO", () => {
  const cancelled = toCancelledShiftDTO(
    { ...row, createdAt: new Date() } as ShiftRow,
    { reason: "no_show", previousNurseId: "nurse-1" },
  );

  it("returns the nine shift keys plus cancellation, ten in all", () => {
    expect(Object.keys(cancelled)).toHaveLength(10);
    expect(Object.keys(cancelled.cancellation).sort()).toEqual(["previousNurseId", "reason"]);
  });

  it("reports an open, unassigned shift and the previous nurse", () => {
    expect(cancelled).toMatchObject({
      status: "open",
      claimedBy: null,
      cancellation: { reason: "no-show", previousNurseId: "nurse-1" },
    });
  });

  it("maps the database spelling to the API spelling and back", () => {
    expect(
      toCancelledShiftDTO(row, { reason: "advance", previousNurseId: "n" }).cancellation.reason,
    ).toBe("advance");
    expect(toDbCancellationReason("no-show")).toBe("no_show");
    expect(toDbCancellationReason("advance")).toBe("advance");
  });
});

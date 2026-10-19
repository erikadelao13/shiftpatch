import { describe, expect, it } from "vitest";

import {
  toTimesheetEntries,
  type AssignmentRow,
  type CancellationRow,
} from "./timesheet-presenter";

function assignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  return {
    id: "shift-a",
    role: "RN",
    date: new Date("2026-10-03"),
    startTime: "07:00",
    endTime: "19:00",
    createdAt: new Date("2026-10-01T10:00:00Z"),
    agency: { name: "Agency A" },
    claimedBy: { name: "Maria Lopez" },
    ...overrides,
  };
}

function cancellation(
  overrides: Partial<Omit<CancellationRow, "shift">> & {
    shift?: Partial<CancellationRow["shift"]>;
  } = {},
): CancellationRow {
  const { shift, ...rest } = overrides;
  return {
    id: "cancellation-a",
    reason: "advance",
    createdAt: new Date("2026-10-02T10:00:00Z"),
    previousNurse: { name: "James Chen" },
    shift: {
      id: "shift-a",
      role: "RN",
      date: new Date("2026-10-03"),
      startTime: "07:00",
      endTime: "19:00",
      createdAt: new Date("2026-10-01T10:00:00Z"),
      agency: { name: "Agency A" },
      ...shift,
    },
    ...rest,
  };
}

describe("toTimesheetEntries", () => {
  it("maps an assignment and converts the date to ISO", () => {
    expect(toTimesheetEntries([assignment()], [])).toEqual([
      {
        id: "shift-a",
        shiftId: "shift-a",
        role: "RN",
        agencyName: "Agency A",
        date: "2026-10-03",
        startTime: "07:00",
        endTime: "19:00",
        nurseName: "Maria Lopez",
        state: "assigned",
      },
    ]);
  });

  it("maps advance to cancelled and no_show to no-show", () => {
    const entries = toTimesheetEntries(
      [],
      [
        cancellation({ id: "c1", reason: "advance" }),
        cancellation({ id: "c2", reason: "no_show", createdAt: new Date("2026-10-02T11:00:00Z") }),
      ],
    );
    expect(entries.map((entry) => entry.state)).toEqual(["cancelled", "no-show"]);
  });

  it("takes a history row's id from the cancellation and its fields from the shift", () => {
    const [entry] = toTimesheetEntries(
      [],
      [cancellation({ shift: { id: "shift-z", agency: { name: "Agency Z" } } })],
    );
    expect(entry).toMatchObject({
      id: "cancellation-a",
      shiftId: "shift-z",
      agencyName: "Agency Z",
      nurseName: "James Chen",
      date: "2026-10-03",
    });
  });

  it("orders by date, then start time", () => {
    const entries = toTimesheetEntries(
      [
        assignment({ id: "shift-late", date: new Date("2026-10-05") }),
        assignment({ id: "shift-evening", startTime: "19:00", endTime: "07:00" }),
        assignment({ id: "shift-morning" }),
      ],
      [],
    );
    expect(entries.map((entry) => entry.id)).toEqual(["shift-morning", "shift-evening", "shift-late"]);
  });

  it("breaks ties by the shift's createdAt, then shift id", () => {
    const entries = toTimesheetEntries(
      [
        assignment({ id: "shift-b", createdAt: new Date("2026-10-01T10:00:00Z") }),
        assignment({ id: "shift-c", createdAt: new Date("2026-10-01T09:00:00Z") }),
        assignment({ id: "shift-a", createdAt: new Date("2026-10-01T10:00:00Z") }),
      ],
      [],
    );
    expect(entries.map((entry) => entry.id)).toEqual(["shift-c", "shift-a", "shift-b"]);
  });

  it("lists history before the current assignment, oldest cancellation first", () => {
    const entries = toTimesheetEntries(
      [assignment()],
      [
        cancellation({ id: "second", createdAt: new Date("2026-10-02T12:00:00Z") }),
        cancellation({ id: "first", createdAt: new Date("2026-10-02T10:00:00Z") }),
      ],
    );
    expect(entries.map((entry) => entry.id)).toEqual(["first", "second", "shift-a"]);
  });

  it("throws on a filled shift with no nurse", () => {
    expect(() => toTimesheetEntries([assignment({ claimedBy: null })], [])).toThrow(
      "Filled shift shift-a has no nurse.",
    );
  });
});

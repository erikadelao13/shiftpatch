import { describe, expect, it } from "vitest";

import type { AdminShift } from "@/contracts/shifts/types";

import {
  ALL,
  agencyNames,
  filterOpenShifts,
  inAgency,
  knownAgencyId,
  statusTabs,
  withStatus,
} from "./filters";

function shift(overrides: Partial<AdminShift>): AdminShift {
  return {
    id: "shift-x",
    agencyId: "agency-a",
    agencyName: "Northside Nursing",
    role: "RN",
    date: "2026-10-02",
    startTime: "07:00",
    endTime: "19:00",
    status: "open",
    nurseName: null,
    ...overrides,
  };
}

const shifts = [
  shift({ id: "a-open" }),
  shift({ id: "a-filled", status: "filled", nurseName: "Maria Lopez" }),
  shift({ id: "b-open", agencyId: "agency-b", agencyName: "Bayview Care", role: "LPN" }),
];

describe("statusTabs", () => {
  it("counts every shift, then open and filled", () => {
    expect(statusTabs(shifts)).toEqual([
      { key: "all", label: "All shifts", count: 3 },
      { key: "open", label: "Open", count: 2 },
      { key: "filled", label: "Filled", count: 1 },
    ]);
  });
});

describe("withStatus", () => {
  it("keeps every shift on the all tab", () => {
    expect(withStatus(shifts, ALL)).toHaveLength(3);
  });

  it("keeps only the tab's status", () => {
    expect(withStatus(shifts, "filled").map((item) => item.id)).toEqual(["a-filled"]);
  });
});

describe("inAgency", () => {
  it("keeps every agency for all", () => {
    expect(inAgency(shifts, ALL)).toHaveLength(3);
  });

  it("keeps one agency's shifts", () => {
    expect(inAgency(shifts, "agency-b").map((item) => item.id)).toEqual(["b-open"]);
  });
});

describe("knownAgencyId", () => {
  const agencies = [{ id: "agency-a", name: "Northside Nursing" }];

  it("keeps an agency that still exists", () => {
    expect(knownAgencyId(agencies, "agency-a")).toBe("agency-a");
  });

  it("falls back to all for an agency that is gone", () => {
    expect(knownAgencyId(agencies, "agency-z")).toBe(ALL);
  });
});

describe("agencyNames", () => {
  it("lists each agency once, sorted", () => {
    expect(agencyNames([...shifts, shift({ agencyName: "Bayview Care" })])).toEqual([
      "Bayview Care",
      "Northside Nursing",
    ]);
  });
});

describe("filterOpenShifts", () => {
  it("keeps everything without filters", () => {
    expect(filterOpenShifts(shifts, { agency: ALL, role: ALL })).toHaveLength(3);
  });

  it("combines the agency and role filters", () => {
    expect(
      filterOpenShifts(shifts, { agency: "Bayview Care", role: "LPN" }).map((item) => item.id),
    ).toEqual(["b-open"]);
    expect(filterOpenShifts(shifts, { agency: "Bayview Care", role: "RN" })).toEqual([]);
  });
});

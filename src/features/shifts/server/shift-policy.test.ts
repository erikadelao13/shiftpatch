import { describe, expect, it } from "vitest";

import type { Actor } from "@/features/auth/types";

import { canPostShift, canReadAgencyShifts } from "./shift-policy";

const agencyA: Actor = { id: "agency-a", name: "A", role: "agency", agencyId: "agency-a" };
const nurse: Actor = { id: "nurse-1", name: "Maria", role: "nurse", agencyId: null };
const admin: Actor = { id: "admin-1", name: "Alex", role: "admin", agencyId: null };
const orphanAgency: Actor = { id: "x", name: "X", role: "agency", agencyId: null };

describe("canPostShift", () => {
  it("allows only an agency with an agency id", () => {
    expect(canPostShift(agencyA)).toBe(true);
    expect(canPostShift(orphanAgency)).toBe(false);
    expect(canPostShift(nurse)).toBe(false);
    expect(canPostShift(admin)).toBe(false);
  });
});

describe("canReadAgencyShifts", () => {
  it("lets an agency read only its own shifts", () => {
    expect(canReadAgencyShifts(agencyA, "agency-a")).toBe(true);
    expect(canReadAgencyShifts(agencyA, "agency-b")).toBe(false);
  });

  it("lets the admin read any agency", () => {
    expect(canReadAgencyShifts(admin, "agency-a")).toBe(true);
    expect(canReadAgencyShifts(admin, "agency-b")).toBe(true);
  });

  it("refuses a nurse and an agency without an id", () => {
    expect(canReadAgencyShifts(nurse, "agency-a")).toBe(false);
    expect(canReadAgencyShifts(orphanAgency, "agency-a")).toBe(false);
  });
});

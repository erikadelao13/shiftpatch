import { describe, expect, it } from "vitest";

import type { Actor } from "@/features/auth/types";

import { canClaimShift, canPostShift, canReadAgencyShifts, credentialClaimError } from "./shift-policy";

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

describe("canClaimShift", () => {
  it("allows only a nurse", () => {
    expect(canClaimShift(nurse)).toBe(true);
    expect(canClaimShift(agencyA)).toBe(false);
    expect(canClaimShift(admin)).toBe(false);
  });
});

describe("credentialClaimError", () => {
  it("allows a valid credential", () => {
    expect(credentialClaimError({ state: "valid", expiresOn: "2027-01-01" })).toBeNull();
  });

  it("names an expired credential", () => {
    expect(credentialClaimError({ state: "expired", expiresOn: "2026-06-01" })).toBe(
      "Credential expired, cannot claim shift",
    );
  });

  it("names a missing credential", () => {
    expect(credentialClaimError({ state: "missing" })).toBe(
      "No credential on file, cannot claim shift",
    );
  });
});

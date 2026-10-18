import { describe, expect, it } from "vitest";

import type { Actor } from "@/features/auth/types";

import {
  canClaimShift,
  canPostShift,
  canReadAgencyShifts,
  canRecordNoShow,
  cancellationRefusal,
  credentialClaimError,
} from "./shift-policy";

const agencyA: Actor = { id: "agency-a", name: "A", role: "agency", agencyId: "agency-a" };
const nurse: Actor = { id: "nurse-1", name: "Maria", role: "nurse", agencyId: null };
const admin: Actor = { id: "admin-1", name: "Alex", role: "admin", agencyId: null };
const agencyB: Actor = { id: "agency-b", name: "B", role: "agency", agencyId: "agency-b" };
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

describe("canRecordNoShow", () => {
  it("allows an agency with an agency id and the admin", () => {
    expect(canRecordNoShow(agencyA)).toBe(true);
    expect(canRecordNoShow(admin)).toBe(true);
  });

  it("refuses a nurse and an agency without an id", () => {
    expect(canRecordNoShow(nurse)).toBe(false);
    expect(canRecordNoShow(orphanAgency)).toBe(false);
  });
});

describe("cancellationRefusal", () => {
  const filled = { agencyId: "agency-a", status: "filled", claimedById: "nurse-1" } as const;
  const open = { agencyId: "agency-a", status: "open", claimedById: null } as const;
  const otherNurse: Actor = { id: "nurse-2", name: "James", role: "nurse", agencyId: null };

  it("allows the owning agency, the admin and the claiming nurse on a filled shift", () => {
    expect(cancellationRefusal(agencyA, filled)).toBeNull();
    expect(cancellationRefusal(admin, filled)).toBeNull();
    expect(cancellationRefusal(nurse, filled)).toBeNull();
  });

  it("refuses another agency's shift with 403", () => {
    expect(cancellationRefusal(agencyB, filled)).toEqual({
      status: 403,
      message: "You can only cancel your own agency's shifts",
    });
  });

  it("refuses an agency without an agency id with 403", () => {
    expect(cancellationRefusal(orphanAgency, filled)?.status).toBe(403);
  });

  it("refuses an open shift with 409", () => {
    const refusal = { status: 409, message: "Shift has no active assignment" };
    expect(cancellationRefusal(agencyA, open)).toEqual(refusal);
    expect(cancellationRefusal(admin, open)).toEqual(refusal);
    expect(cancellationRefusal(nurse, open)).toEqual(refusal);
  });

  it("refuses a nurse on another nurse's claim with 403", () => {
    expect(cancellationRefusal(otherNurse, filled)).toEqual({
      status: 403,
      message: "You can only cancel your own shifts",
    });
  });

  it("checks agency scope before the open state, so another agency gets 403 on an open shift", () => {
    expect(cancellationRefusal(agencyB, open)?.status).toBe(403);
  });

  it("checks the open state before the claimer, so a nurse cancelling twice gets 409", () => {
    expect(cancellationRefusal(otherNurse, open)?.status).toBe(409);
    expect(cancellationRefusal(nurse, open)?.status).toBe(409);
  });
});

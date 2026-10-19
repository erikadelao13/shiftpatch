import { describe, expect, it } from "vitest";

import { describeAuditEvent, formatEventTime } from "./describe-event";
import type { AuditEntry } from "@/contracts/audit/types";

const maria = { id: "nurse-1", name: "Maria Lopez", role: "nurse" } as const;
const sunrise = { id: "agency-a", name: "Sunrise Health Staffing", role: "agency" } as const;
const base = { id: "event-1", occurredAt: "2026-10-18T08:05:00.000Z", recordId: "shift-1" };

describe("describeAuditEvent", () => {
  it("describes a posted shift by role, date and starting status", () => {
    const entry: AuditEntry = {
      ...base,
      actor: sunrise,
      action: "shift_posted",
      shift: { role: "LPN", date: "2026-10-23" },
    };
    expect(describeAuditEvent(entry)).toEqual({
      icon: "posted",
      label: "Shift posted",
      details: ["LPN", "Oct 23, 2026", "Open"],
    });
  });

  it("describes a claim as open to filled", () => {
    const entry: AuditEntry = { ...base, actor: maria, action: "shift_claimed" };
    expect(describeAuditEvent(entry)).toEqual({
      icon: "claimed",
      label: "Shift claimed",
      details: ["Open → Filled"],
    });
  });

  it("omits the unassigned nurse when the nurse cancelled their own claim", () => {
    const entry: AuditEntry = {
      ...base,
      actor: maria,
      action: "shift_cancelled",
      reason: "advance",
      previousNurse: { id: "nurse-1", name: "Maria Lopez" },
    };
    expect(describeAuditEvent(entry)).toEqual({
      icon: "cancelled",
      label: "Assignment cancelled",
      details: ["In advance", "Filled → Open"],
    });
  });

  it("names the unassigned nurse when someone else cancelled in advance", () => {
    const entry: AuditEntry = {
      ...base,
      actor: sunrise,
      action: "shift_cancelled",
      reason: "advance",
      previousNurse: { id: "nurse-1", name: "Maria Lopez" },
    };
    expect(describeAuditEvent(entry).details).toEqual([
      "In advance",
      "Maria Lopez unassigned",
      "Filled → Open",
    ]);
  });

  it("describes a no-show with the unassigned nurse", () => {
    const entry: AuditEntry = {
      ...base,
      actor: sunrise,
      action: "shift_cancelled",
      reason: "no-show",
      previousNurse: { id: "nurse-1", name: "Maria Lopez" },
    };
    expect(describeAuditEvent(entry)).toEqual({
      icon: "no-show",
      label: "No-show reported",
      details: ["Maria Lopez unassigned", "Filled → Open"],
    });
  });

  it("shows the previous and new expiry when a credential is replaced", () => {
    const entry: AuditEntry = {
      ...base,
      actor: maria,
      recordId: "nurse-1",
      action: "credential_updated",
      previousExpiresOn: "2027-01-01",
      expiresOn: "2028-01-01",
    };
    expect(describeAuditEvent(entry)).toEqual({
      icon: "credential",
      label: "Credential replaced",
      details: ["Expiry: Jan 1, 2027 → Jan 1, 2028"],
    });
  });

  it("shows only the new expiry for a first credential", () => {
    const entry: AuditEntry = {
      ...base,
      actor: maria,
      recordId: "nurse-1",
      action: "credential_updated",
      previousExpiresOn: null,
      expiresOn: "2028-01-01",
    };
    expect(describeAuditEvent(entry)).toEqual({
      icon: "credential",
      label: "Credential added",
      details: ["Expiry: Jan 1, 2028"],
    });
  });
});

describe("formatEventTime", () => {
  it("reads the UTC date and 24-hour time from an ISO timestamp", () => {
    expect(formatEventTime("2026-10-18T23:45:09.120Z")).toEqual({
      date: "Oct 18, 2026",
      time: "23:45",
    });
  });
});

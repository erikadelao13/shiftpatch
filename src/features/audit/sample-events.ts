import type { AuditEntry } from "./types";

const maria = { id: "nurse-1", name: "Maria Lopez", role: "nurse" } as const;
const sunrise = { id: "agency-a", name: "Sunrise Health Staffing", role: "agency" } as const;

// Stand-in until the audit plan reads AuditEvent rows: the approved mockup's events, newest first.
export const sampleAuditEntries: AuditEntry[] = [
  {
    id: "sample-event-5",
    occurredAt: "2026-10-18T08:20:00.000Z",
    actor: maria,
    recordId: "nurse-1",
    action: "credential_updated",
    previousExpiresOn: "2027-01-01",
    expiresOn: "2028-01-01",
  },
  {
    id: "sample-event-4",
    occurredAt: "2026-10-18T08:15:00.000Z",
    actor: sunrise,
    recordId: "shift-2",
    action: "shift_cancelled",
    reason: "no-show",
    previousNurse: maria,
  },
  {
    id: "sample-event-3",
    occurredAt: "2026-10-18T08:10:00.000Z",
    actor: maria,
    recordId: "shift-1",
    action: "shift_cancelled",
    reason: "advance",
    previousNurse: maria,
  },
  {
    id: "sample-event-2",
    occurredAt: "2026-10-18T08:05:00.000Z",
    actor: maria,
    recordId: "shift-1",
    action: "shift_claimed",
  },
  {
    id: "sample-event-1",
    occurredAt: "2026-10-18T08:00:00.000Z",
    actor: sunrise,
    recordId: "shift-7c1e4b2a-93d5-4f06-8a1b-5e2d9c3f6a70",
    action: "shift_posted",
    shift: { role: "LPN", date: "2026-10-23" },
  },
];

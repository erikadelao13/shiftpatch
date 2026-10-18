import { describe, expect, it } from "vitest";

import { previousNurseIds, toAuditEntry, type AuditRow } from "./audit-presenter";

const agency = { id: "agency-a", name: "Sunrise Health Staffing", role: "agency" } as const;
const maria = { id: "nurse-1", name: "Maria Lopez", role: "nurse" } as const;
const names = new Map([["nurse-1", "Maria Lopez"]]);

function row(overrides: Partial<AuditRow> & Pick<AuditRow, "action">): AuditRow {
  return {
    id: "event-1",
    resourceId: "shift-1",
    metadata: null,
    createdAt: new Date("2026-10-18T08:05:00.000Z"),
    actorId: overrides.actor?.id ?? agency.id,
    actor: agency,
    ...overrides,
  };
}

describe("toAuditEntry", () => {
  it("maps a posted shift with its snapshot", () => {
    const entry = toAuditEntry(
      row({
        action: "shift_posted",
        metadata: { agencyId: "agency-a", role: "LPN", date: "2026-10-23" },
      }),
      names,
    );
    expect(entry).toEqual({
      id: "event-1",
      occurredAt: "2026-10-18T08:05:00.000Z",
      actor: agency,
      recordId: "shift-1",
      action: "shift_posted",
      shift: { role: "LPN", date: "2026-10-23" },
    });
  });

  it("maps a claim", () => {
    const entry = toAuditEntry(
      row({ action: "shift_claimed", actor: maria, metadata: { agencyId: "agency-a" } }),
      names,
    );
    expect(entry).toMatchObject({ action: "shift_claimed", actor: maria, recordId: "shift-1" });
  });

  it("tells a no-show from an advance cancellation and names the unassigned nurse", () => {
    const metadata = { agencyId: "agency-a", previousNurseId: "nurse-1" };
    const noShow = toAuditEntry(
      row({ action: "shift_cancelled", metadata: { ...metadata, reason: "no-show" } }),
      names,
    );
    const advance = toAuditEntry(
      row({ action: "shift_cancelled", metadata: { ...metadata, reason: "advance" } }),
      names,
    );
    expect(noShow).toMatchObject({
      reason: "no-show",
      previousNurse: { id: "nurse-1", name: "Maria Lopez" },
    });
    expect(advance).toMatchObject({ reason: "advance" });
  });

  it("keeps a self-cancel's previous nurse equal to the actor", () => {
    const entry = toAuditEntry(
      row({
        action: "shift_cancelled",
        actor: maria,
        metadata: { agencyId: "agency-a", reason: "advance", previousNurseId: "nurse-1" },
      }),
      names,
    );
    expect(entry).toMatchObject({
      actor: maria,
      previousNurse: { id: maria.id, name: maria.name },
    });
  });

  it("falls back to the ID when the previous nurse has no name", () => {
    const entry = toAuditEntry(
      row({
        action: "shift_cancelled",
        metadata: { agencyId: "agency-a", reason: "no-show", previousNurseId: "gone" },
      }),
      names,
    );
    expect(entry).toMatchObject({ previousNurse: { id: "gone", name: "gone" } });
  });

  it("maps a first credential save and a replacement", () => {
    const first = toAuditEntry(
      row({
        action: "credential_updated",
        actor: maria,
        resourceId: "credential-uuid",
        metadata: { nurseId: "nurse-1", previousExpiresOn: null, expiresOn: "2027-03-01" },
      }),
      names,
    );
    const replacement = toAuditEntry(
      row({
        action: "credential_updated",
        actor: maria,
        resourceId: "credential-uuid",
        metadata: {
          nurseId: "nurse-1",
          previousExpiresOn: "2027-03-01",
          expiresOn: "2028-04-02",
        },
      }),
      names,
    );
    expect(first).toMatchObject({ previousExpiresOn: null, expiresOn: "2027-03-01" });
    expect(replacement).toMatchObject({ previousExpiresOn: "2027-03-01", expiresOn: "2028-04-02" });
  });

  it("uses the nurse ID for a credential record, falling back to the actor on older rows", () => {
    const withNurseId = toAuditEntry(
      row({
        action: "credential_updated",
        actor: maria,
        resourceId: "credential-uuid",
        metadata: { nurseId: "nurse-9", previousExpiresOn: null, expiresOn: "2027-03-01" },
      }),
      names,
    );
    const older = toAuditEntry(
      row({
        action: "credential_updated",
        actor: maria,
        resourceId: "credential-uuid",
        metadata: { previousExpiresOn: null, expiresOn: "2027-03-01" },
      }),
      names,
    );
    expect(withNurseId.recordId).toBe("nurse-9");
    expect(older.recordId).toBe("nurse-1");
  });

  it("throws on malformed metadata instead of hiding the row", () => {
    expect(() => toAuditEntry(row({ action: "shift_posted", metadata: { agencyId: "x" } }), names)).toThrow();
    expect(() => toAuditEntry(row({ action: "shift_claimed", metadata: null }), names)).toThrow();
    expect(() =>
      toAuditEntry(
        row({
          action: "shift_cancelled",
          metadata: { agencyId: "a", reason: "late", previousNurseId: "nurse-1" },
        }),
        names,
      ),
    ).toThrow();
    expect(() =>
      toAuditEntry(
        row({
          action: "credential_updated",
          metadata: { previousExpiresOn: null, expiresOn: "soon" },
        }),
        names,
      ),
    ).toThrow();
  });
});

describe("previousNurseIds", () => {
  it("collects each cancelled shift's previous nurse once", () => {
    const cancelled = (previousNurseId: string) =>
      row({
        action: "shift_cancelled",
        metadata: { agencyId: "agency-a", reason: "advance", previousNurseId },
      });
    expect(
      previousNurseIds([
        cancelled("nurse-1"),
        cancelled("nurse-1"),
        cancelled("nurse-2"),
        row({ action: "shift_claimed", metadata: { agencyId: "agency-a" } }),
      ]),
    ).toEqual(["nurse-1", "nurse-2"]);
  });
});

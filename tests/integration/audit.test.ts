import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listAuditEntries } from "@/server/audit/audit-service";
import type { Actor } from "@/contracts/auth/types";
import { saveCredential } from "@/server/credentials/credential-service";
import { cancelShift, claimShift, createShift } from "@/server/shifts/shift-service";
import { getDb, getPrisma } from "@/server/db";

// Runs on the Neon dev branch. Every actor and shift is throwaway; the audit
// rows are deleted before the users they reference.
const prisma = getPrisma();
const runId = randomUUID().slice(0, 8);
const agencyId = `test-${runId}-agency`;

const agencyUser: Actor = {
  id: `test-${runId}-agency-user`,
  name: "Throwaway Agency",
  role: "agency",
  agencyId,
};
const nurse: Actor = {
  id: `test-${runId}-nurse`,
  name: "Throwaway Nurse",
  role: "nurse",
  agencyId: null,
};
const users = [agencyUser, nurse];
const shiftIds: string[] = [];

beforeAll(async () => {
  await prisma.agency.create({ data: { id: agencyId, name: "Throwaway Agency" } });
  await prisma.user.createMany({
    data: users.map((user) => ({
      id: user.id,
      email: `${user.id}@example.test`,
      name: user.name,
      role: user.role,
      agencyId: user.agencyId,
      passwordHash: "not-a-real-hash",
    })),
  });
});

afterAll(async () => {
  const userIds = users.map((user) => user.id);
  await prisma.auditEvent.deleteMany({
    where: { OR: [{ actorId: { in: userIds } }, { resourceId: { in: shiftIds } }] },
  });
  await prisma.shift.deleteMany({ where: { agencyId } });
  await prisma.cancellation.deleteMany({ where: { shiftId: { in: shiftIds } } });
  await prisma.credential.deleteMany({ where: { nurseId: nurse.id } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.agency.deleteMany({ where: { id: agencyId } });
  await getDb().end();
});

describe("listAuditEntries", () => {
  it("returns what every writer recorded as parsed entries, newest first", async () => {
    const credentialFile = new File(["%PDF-1.7\naudit"], "license.pdf", {
      type: "application/pdf",
    });
    await saveCredential(nurse, { file: credentialFile, expiresOn: "2030-01-01" });
    const shift = await createShift(agencyUser, {
      role: "RN",
      date: "2026-12-01",
      startTime: "07:00",
      endTime: "19:00",
    });
    shiftIds.push(shift.id);
    await claimShift(nurse, shift.id);
    await cancelShift(agencyUser, shift.id, "no-show");

    const { entries, total } = await listAuditEntries();
    const mine = entries.filter((entry) => users.some((user) => user.id === entry.actor.id));

    expect(total).toBeGreaterThanOrEqual(4);
    expect(mine.map((entry) => entry.action)).toEqual([
      "shift_cancelled",
      "shift_claimed",
      "shift_posted",
      "credential_updated",
    ]);
    const [cancelled, claimed, posted, credential] = mine;
    expect(cancelled).toMatchObject({
      actor: { id: agencyUser.id, name: agencyUser.name, role: "agency" },
      recordId: shift.id,
      reason: "no-show",
      previousNurse: { id: nurse.id, name: nurse.name },
    });
    expect(claimed).toMatchObject({
      actor: { id: nurse.id, name: nurse.name, role: "nurse" },
      recordId: shift.id,
    });
    expect(posted).toMatchObject({
      actor: { id: agencyUser.id, role: "agency" },
      recordId: shift.id,
      shift: { role: "RN", date: "2026-12-01" },
    });
    expect(credential).toMatchObject({
      actor: { id: nurse.id },
      recordId: nurse.id,
      previousExpiresOn: null,
      expiresOn: "2030-01-01",
    });
  });

  it("returns exactly the newest 50 of a longer history with the full total", async () => {
    const start = Date.now() + 60_000;
    await prisma.auditEvent.createMany({
      data: Array.from({ length: 51 }, (_, index) => ({
        actorId: nurse.id,
        action: "shift_claimed" as const,
        resourceType: "shift",
        resourceId: `test-${runId}-bulk-${index}`,
        metadata: { agencyId },
        createdAt: new Date(start + index * 1000),
      })),
    });

    const { entries, total } = await listAuditEntries();

    expect(entries).toHaveLength(50);
    expect(total).toBeGreaterThanOrEqual(55);
    expect(entries.every((entry) => entry.actor.id === nurse.id)).toBe(true);
    const times = entries.map((entry) => entry.occurredAt);
    expect(times).toEqual([...times].sort().reverse());
    expect(entries[0].recordId).toBe(`test-${runId}-bulk-50`);
  });
});

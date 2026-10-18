import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Actor } from "@/features/auth/types";
import { cancelShift, claimShift, createShift } from "@/features/shifts/server/shift-service";
import { listTimesheetEntries } from "@/features/timesheets/server/timesheet-service";
import { getDb, getPrisma } from "@/shared/server/db";

import { assertSeededState } from "./support";

// Runs on the Neon dev branch and needs `pnpm db:seed`. Every shift here is
// throwaway; seeded shift-2 is only read.
const prisma = getPrisma();
const runId = randomUUID().slice(0, 8);

const agencyOf = (key: string): Actor => ({
  id: `test-${runId}-${key}-user`,
  name: `Throwaway ${key}`,
  role: "agency",
  agencyId: `test-${runId}-${key}`,
});
const nurseOf = (key: string): Actor => ({
  id: `test-${runId}-${key}`,
  name: `Throwaway ${key}`,
  role: "nurse",
  agencyId: null,
});
const agencyOne = agencyOf("agency-one");
const agencyTwo = agencyOf("agency-two");
const nurseOne = nurseOf("nurse-one");
const nurseTwo = nurseOf("nurse-two");

const throwawayAgencies = [agencyOne, agencyTwo];
const throwawayUsers = [...throwawayAgencies, nurseOne, nurseTwo];
const createdShiftIds: string[] = [];

async function postShift(
  agency: Actor,
  date: string,
  startTime = "07:00",
  endTime = "19:00",
): Promise<string> {
  const shift = await createShift(agency, { role: "RN", date, startTime, endTime });
  createdShiftIds.push(shift.id);
  return shift.id;
}

async function entriesFor(scope: Parameters<typeof listTimesheetEntries>[0], shiftIds: string[]) {
  const entries = await listTimesheetEntries(scope);
  return entries.filter((entry) => shiftIds.includes(entry.shiftId));
}

beforeAll(async () => {
  await assertSeededState();

  await prisma.agency.createMany({
    data: throwawayAgencies.map((agency) => ({ id: agency.agencyId!, name: agency.name })),
  });
  await prisma.user.createMany({
    data: throwawayUsers.map((user) => ({
      id: user.id,
      email: `${user.id}@example.test`,
      name: user.name,
      role: user.role,
      agencyId: user.agencyId,
      passwordHash: "not-a-real-hash",
    })),
  });
  await prisma.credential.createMany({
    data: [nurseOne, nurseTwo].map((nurse) => ({
      nurseId: nurse.id,
      expiresOn: new Date("2030-01-01"),
    })),
  });
});

afterAll(async () => {
  const userIds = throwawayUsers.map((user) => user.id);
  const agencyIds = throwawayAgencies.map((agency) => agency.agencyId!);
  await prisma.auditEvent.deleteMany({
    where: { OR: [{ actorId: { in: userIds } }, { resourceId: { in: createdShiftIds } }] },
  });
  await prisma.shift.deleteMany({ where: { agencyId: { in: agencyIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
  await getDb().end();
});

describe("listTimesheetEntries", () => {
  it("lists a cancelled claim and the reclaim as history then assigned", async () => {
    const shiftId = await postShift(agencyOne, "2031-03-01");
    await claimShift(nurseOne, shiftId);
    await cancelShift(nurseOne, shiftId, "advance");
    await claimShift(nurseOne, shiftId);
    const cancellation = await prisma.cancellation.findFirstOrThrow({ where: { shiftId } });

    const entries = await entriesFor({ kind: "nurse", nurseId: nurseOne.id }, [shiftId]);

    expect(entries.map((entry) => [entry.state, entry.id])).toEqual([
      ["cancelled", cancellation.id],
      ["assigned", shiftId],
    ]);
  });

  it("shows a no-show only to the nurse who was cancelled", async () => {
    const shiftId = await postShift(agencyOne, "2031-03-02");
    await claimShift(nurseOne, shiftId);
    await cancelShift(agencyOne, shiftId, "no-show");
    await claimShift(nurseTwo, shiftId);

    const forOne = await entriesFor({ kind: "nurse", nurseId: nurseOne.id }, [shiftId]);
    const forTwo = await entriesFor({ kind: "nurse", nurseId: nurseTwo.id }, [shiftId]);

    expect(forOne.map((entry) => [entry.state, entry.nurseName])).toEqual([
      ["no-show", nurseOne.name],
    ]);
    expect(forTwo.map((entry) => [entry.state, entry.id, entry.nurseName])).toEqual([
      ["assigned", shiftId, nurseTwo.name],
    ]);
  });

  it("keeps each agency's rows to itself", async () => {
    const shiftOne = await postShift(agencyOne, "2031-03-03");
    const shiftTwo = await postShift(agencyTwo, "2031-03-03");
    await claimShift(nurseOne, shiftOne);
    await claimShift(nurseTwo, shiftTwo);
    await cancelShift(agencyTwo, shiftTwo, "advance");
    await claimShift(nurseTwo, shiftTwo);
    const both = [shiftOne, shiftTwo];

    const forOne = await entriesFor({ kind: "agency", agencyId: agencyOne.agencyId! }, both);
    const forTwo = await entriesFor({ kind: "agency", agencyId: agencyTwo.agencyId! }, both);

    expect(forOne.map((entry) => entry.shiftId)).toEqual([shiftOne]);
    expect(forTwo.map((entry) => entry.shiftId)).toEqual([shiftTwo, shiftTwo]);
    expect(forOne.every((entry) => entry.agencyName === agencyOne.name)).toBe(true);
    expect(forTwo.every((entry) => entry.agencyName === agencyTwo.name)).toBe(true);
  });

  it("orders entries by schedule whatever order the shifts were posted in", async () => {
    const late = await postShift(agencyOne, "2031-03-06");
    const evening = await postShift(agencyOne, "2031-03-05", "19:00", "07:00");
    const morning = await postShift(agencyOne, "2031-03-05");
    for (const shiftId of [late, evening, morning]) await claimShift(nurseOne, shiftId);

    const entries = await entriesFor({ kind: "nurse", nurseId: nurseOne.id }, [late, evening, morning]);

    expect(entries.map((entry) => entry.shiftId)).toEqual([morning, evening, late]);
  });

  it("includes seeded shift-2 and every throwaway agency's rows in the all scope", async () => {
    const shiftOne = await postShift(agencyOne, "2031-03-07");
    const shiftTwo = await postShift(agencyTwo, "2031-03-07");
    await claimShift(nurseOne, shiftOne);
    await claimShift(nurseTwo, shiftTwo);

    const entries = await listTimesheetEntries({ kind: "all" });

    expect(entries.find((entry) => entry.shiftId === "shift-2")).toMatchObject({
      id: "shift-2",
      nurseName: "Maria Lopez",
      state: "assigned",
    });
    const ours = entries.filter((entry) => [shiftOne, shiftTwo].includes(entry.shiftId));
    expect(ours.map((entry) => entry.shiftId).sort()).toEqual([shiftOne, shiftTwo].sort());
  });

  it("yields nothing for an open shift with no history", async () => {
    const shiftId = await postShift(agencyOne, "2031-03-08");

    expect(await entriesFor({ kind: "all" }, [shiftId])).toEqual([]);
  });
});

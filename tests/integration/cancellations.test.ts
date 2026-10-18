import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Actor } from "@/features/auth/types";
import { cancelShift, claimShift, createShift } from "@/features/shifts/server/shift-service";
import { getDb, getPrisma } from "@/shared/server/db";
import { HttpError } from "@/shared/server/errors";

import { assertSeededState, expectHttpError } from "./support";

// Runs on the Neon dev branch and needs `pnpm db:seed`. Every cancellation
// here is on a throwaway shift; the seeded shifts are only read.
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
const admin: Actor = { id: "admin-1", name: "Alex Kim", role: "admin", agencyId: null };

const throwawayAgencies = [agencyOne, agencyTwo];
const throwawayNurses = [nurseOne, nurseTwo];
const throwawayUsers = [...throwawayAgencies, ...throwawayNurses];
const createdShiftIds: string[] = [];

async function openShift(agency: Actor = agencyOne): Promise<string> {
  const shift = await createShift(agency, {
    role: "RN",
    date: "2026-12-01",
    startTime: "07:00",
    endTime: "19:00",
  });
  createdShiftIds.push(shift.id);
  return shift.id;
}

async function filledShift(agency: Actor = agencyOne, nurse: Actor = nurseOne): Promise<string> {
  const shiftId = await openShift(agency);
  await claimShift(nurse, shiftId);
  return shiftId;
}

const cancellationRowsFor = (shiftId: string) =>
  prisma.cancellation.findMany({ where: { shiftId }, orderBy: { createdAt: "asc" } });
const cancelEventsFor = (shiftId: string) =>
  prisma.auditEvent.findMany({
    where: { resourceType: "shift", resourceId: shiftId, action: "shift_cancelled" },
  });

async function expectUntouched(shiftId: string, nurse: Actor) {
  const row = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
  expect(row.status).toBe("filled");
  expect(row.claimedById).toBe(nurse.id);
  expect(await cancellationRowsFor(shiftId)).toHaveLength(0);
  expect(await cancelEventsFor(shiftId)).toHaveLength(0);
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
    data: throwawayNurses.map((nurse) => ({ nurseId: nurse.id, expiresOn: new Date("2030-01-01") })),
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

describe("cancelShift", () => {
  it("reopens the shift for an agency no-show and records the history", async () => {
    const shiftId = await filledShift();

    const dto = await cancelShift(agencyOne, shiftId, "no-show");

    expect(dto).toEqual({
      id: shiftId,
      agencyId: agencyOne.agencyId,
      agencyName: agencyOne.name,
      role: "RN",
      date: "2026-12-01",
      startTime: "07:00",
      endTime: "19:00",
      status: "open",
      claimedBy: null,
      cancellation: { reason: "no-show", previousNurseId: nurseOne.id },
    });
    const row = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
    expect(row.status).toBe("open");
    expect(row.claimedById).toBeNull();

    const rows = await cancellationRowsFor(shiftId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reason: "no_show",
      previousNurseId: nurseOne.id,
      actorId: agencyOne.id,
    });
    expect(Math.abs(Date.now() - rows[0].createdAt.getTime())).toBeLessThan(60_000);

    const events = await cancelEventsFor(shiftId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actorId: agencyOne.id,
      resourceType: "shift",
      resourceId: shiftId,
      metadata: { agencyId: agencyOne.agencyId, reason: "no-show", previousNurseId: nurseOne.id },
    });
  });

  it("reopens the shift for an agency advance cancel", async () => {
    const shiftId = await filledShift();

    const dto = await cancelShift(agencyOne, shiftId, "advance");

    expect(dto).toMatchObject({
      status: "open",
      claimedBy: null,
      cancellation: { reason: "advance", previousNurseId: nurseOne.id },
    });
    expect(await cancellationRowsFor(shiftId)).toMatchObject([{ reason: "advance", actorId: agencyOne.id }]);
    expect(await cancelEventsFor(shiftId)).toHaveLength(1);
  });

  it("lets a nurse cancel her own claim in advance", async () => {
    const shiftId = await filledShift();

    const dto = await cancelShift(nurseOne, shiftId, "advance");

    expect(dto.cancellation).toEqual({ reason: "advance", previousNurseId: nurseOne.id });
    expect(await cancellationRowsFor(shiftId)).toMatchObject([{ actorId: nurseOne.id, reason: "advance" }]);
    expect((await cancelEventsFor(shiftId))[0].actorId).toBe(nurseOne.id);
  });

  it.each(["advance", "no-show"] as const)("lets the admin cancel with %s on either agency's shift", async (reason) => {
    for (const agency of throwawayAgencies) {
      const shiftId = await filledShift(agency);

      const dto = await cancelShift(admin, shiftId, reason);

      expect(dto).toMatchObject({ status: "open", claimedBy: null, cancellation: { reason } });
      expect(await cancellationRowsFor(shiftId)).toMatchObject([{ actorId: admin.id }]);
    }
  });

  it("refuses a nurse's no-show before reading the shift, even for an unknown shift", async () => {
    const shiftId = await filledShift();

    await expectHttpError(
      cancelShift(nurseOne, shiftId, "no-show"),
      403,
      "Only agencies and admins can record a no-show",
    );
    await expectHttpError(
      cancelShift(nurseOne, `shift-${randomUUID()}`, "no-show"),
      403,
      "Only agencies and admins can record a no-show",
    );

    await expectUntouched(shiftId, nurseOne);
  });

  it("answers an unknown shift with 404", async () => {
    await expectHttpError(cancelShift(agencyOne, `shift-${randomUUID()}`, "advance"), 404, "Shift not found");
  });

  it("refuses another agency's shift with 403, filled or open", async () => {
    const filledId = await filledShift(agencyOne);
    const openId = await openShift(agencyOne);

    await expectHttpError(
      cancelShift(agencyTwo, filledId, "advance"),
      403,
      "You can only cancel your own agency's shifts",
    );
    await expectHttpError(
      cancelShift(agencyTwo, openId, "no-show"),
      403,
      "You can only cancel your own agency's shifts",
    );

    await expectUntouched(filledId, nurseOne);
    expect(await cancellationRowsFor(openId)).toHaveLength(0);
  });

  it("answers an open shift with 409", async () => {
    const shiftId = await openShift();

    await expectHttpError(cancelShift(agencyOne, shiftId, "advance"), 409, "Shift has no active assignment");
    await expectHttpError(cancelShift(admin, shiftId, "no-show"), 409, "Shift has no active assignment");
    await expectHttpError(cancelShift(nurseOne, shiftId, "advance"), 409, "Shift has no active assignment");

    expect(await cancellationRowsFor(shiftId)).toHaveLength(0);
    expect(await cancelEventsFor(shiftId)).toHaveLength(0);
  });

  it("answers a second cancel of the same claim with 409, not 403", async () => {
    const shiftId = await filledShift();
    await cancelShift(nurseOne, shiftId, "advance");

    await expectHttpError(cancelShift(nurseOne, shiftId, "advance"), 409, "Shift has no active assignment");
    await expectHttpError(cancelShift(nurseTwo, shiftId, "advance"), 409, "Shift has no active assignment");

    expect(await cancellationRowsFor(shiftId)).toHaveLength(1);
    expect(await cancelEventsFor(shiftId)).toHaveLength(1);
  });

  it("refuses a nurse on another nurse's claim with 403", async () => {
    const shiftId = await filledShift(agencyOne, nurseOne);

    await expectHttpError(cancelShift(nurseTwo, shiftId, "advance"), 403, "You can only cancel your own shifts");

    await expectUntouched(shiftId, nurseOne);
  });

  it("keeps both cancellations when a reopened shift is claimed and cancelled again", async () => {
    const shiftId = await filledShift(agencyOne, nurseOne);
    await cancelShift(agencyOne, shiftId, "no-show");
    await claimShift(nurseTwo, shiftId);

    await cancelShift(nurseTwo, shiftId, "advance");

    const rows = await cancellationRowsFor(shiftId);
    expect(rows.map((row) => [row.reason, row.previousNurseId])).toEqual([
      ["no_show", nurseOne.id],
      ["advance", nurseTwo.id],
    ]);
    expect(await cancelEventsFor(shiftId)).toHaveLength(2);
  });

  it("gives exactly one of two concurrent cancels the shift", async () => {
    for (let round = 0; round < 5; round += 1) {
      const shiftId = await filledShift();

      const results = await Promise.allSettled([
        cancelShift(agencyOne, shiftId, "no-show"),
        cancelShift(nurseOne, shiftId, "advance"),
      ]);

      const winners = results.filter((result) => result.status === "fulfilled");
      const losers = results.filter((result) => result.status === "rejected");
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      const loser = (losers[0] as PromiseRejectedResult).reason;
      expect(loser).toBeInstanceOf(HttpError);
      expect((loser as HttpError).status).toBe(409);

      const row = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
      expect(row.status).toBe("open");
      expect(await cancellationRowsFor(shiftId)).toHaveLength(1);
      expect(await cancelEventsFor(shiftId)).toHaveLength(1);
    }
  }, 60_000);
});

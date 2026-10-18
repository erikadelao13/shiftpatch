import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fixtureCredentials, fixtureShifts } from "../../prisma/fixtures";
import type { Actor } from "@/features/auth/types";
import { claimShift, createShift } from "@/features/shifts/server/shift-service";
import { getDb, getPrisma } from "@/shared/server/db";
import { HttpError } from "@/shared/server/errors";

// Runs on the Neon dev branch and needs `pnpm db:seed`. Every claim here is
// on a throwaway shift; the seeded shifts are only read.
const prisma = getPrisma();
const runId = randomUUID().slice(0, 8);
const agencyId = `test-${runId}-agency`;
const EXPIRES_ON = "2028-05-15";

const throwawayAgency: Actor = {
  id: `test-${runId}-agency-user`,
  name: "Throwaway Agency",
  role: "agency",
  agencyId,
};
const nurseOf = (key: string): Actor => ({
  id: `test-${runId}-${key}`,
  name: `Throwaway ${key}`,
  role: "nurse",
  agencyId: null,
});
const validNurse = nurseOf("valid");
const expiredNurse = nurseOf("expired");
const boundaryNurse = nurseOf("boundary");
const missingNurse = nurseOf("missing");
const racerOne = nurseOf("racer-one");
const racerTwo = nurseOf("racer-two");
const admin: Actor = { id: "admin-1", name: "Alex Kim", role: "admin", agencyId: null };
const james: Actor = { id: "nurse-2", name: "James Cook", role: "nurse", agencyId: null };

const credentialDates = new Map([
  [validNurse.id, "2030-01-01"],
  [expiredNurse.id, "2020-01-01"],
  [boundaryNurse.id, EXPIRES_ON],
  [racerOne.id, "2030-01-01"],
  [racerTwo.id, "2030-01-01"],
]);
const throwawayUsers = [throwawayAgency, validNurse, expiredNurse, boundaryNurse, missingNurse, racerOne, racerTwo];
const createdShiftIds: string[] = [];

async function expectHttpError(promise: Promise<unknown>, status: number, message?: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  if (message) expect((error as HttpError).message).toBe(message);
}

async function openShift(): Promise<string> {
  const shift = await createShift(throwawayAgency, {
    role: "RN",
    date: "2026-12-01",
    startTime: "07:00",
    endTime: "19:00",
  });
  createdShiftIds.push(shift.id);
  return shift.id;
}

const auditRowsFor = (resourceId: string) =>
  prisma.auditEvent.findMany({ where: { resourceType: "shift", resourceId } });

beforeAll(async () => {
  const [shifts, credentials] = await Promise.all([
    prisma.shift.findMany({ where: { id: { in: fixtureShifts.map((shift) => shift.id) } } }),
    prisma.credential.findMany({ where: { nurseId: { in: fixtureCredentials.map((c) => c.nurseId) } } }),
  ]);
  const shiftsMatch =
    shifts.length === fixtureShifts.length &&
    shifts.every((row) => {
      const spec = fixtureShifts.find((shift) => shift.id === row.id);
      return spec?.status === row.status && spec.claimedById === row.claimedById;
    });
  const credentialsMatch =
    credentials.length === fixtureCredentials.length &&
    credentials.every(
      (row) =>
        fixtureCredentials.find((c) => c.nurseId === row.nurseId)?.expiresOn ===
        row.expiresOn.toISOString().slice(0, 10),
    );
  if (!shiftsMatch || !credentialsMatch) {
    throw new Error("The seeded shifts or credentials are missing or changed. Run `pnpm db:seed` first.");
  }

  await prisma.agency.create({ data: { id: agencyId, name: "Throwaway Agency" } });
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
    data: [...credentialDates].map(([nurseId, date]) => ({ nurseId, expiresOn: new Date(date) })),
  });
});

afterAll(async () => {
  const userIds = throwawayUsers.map((user) => user.id);
  await prisma.auditEvent.deleteMany({
    where: { OR: [{ actorId: { in: userIds } }, { resourceId: { in: createdShiftIds } }] },
  });
  await prisma.shift.deleteMany({ where: { agencyId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.agency.deleteMany({ where: { id: agencyId } });
  await getDb().end();
});

describe("claimShift", () => {
  it("fills the shift for a nurse with a valid credential and audits it once", async () => {
    const shiftId = await openShift();

    const dto = await claimShift(validNurse, shiftId);

    expect(dto).toEqual({
      id: shiftId,
      agencyId,
      agencyName: "Throwaway Agency",
      role: "RN",
      date: "2026-12-01",
      startTime: "07:00",
      endTime: "19:00",
      status: "filled",
      claimedBy: validNurse.id,
    });
    const row = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
    expect(row.status).toBe("filled");
    expect(row.claimedById).toBe(validNurse.id);

    const events = await auditRowsFor(shiftId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actorId: validNurse.id,
      action: "shift_claimed",
      resourceType: "shift",
      resourceId: shiftId,
      metadata: { agencyId },
    });
    expect(Math.abs(Date.now() - events[0].createdAt.getTime())).toBeLessThan(60_000);
  });

  it("accepts the day before the expiry date and the expiry date itself", async () => {
    await expect(claimShift(boundaryNurse, await openShift(), "2028-05-14")).resolves.toMatchObject({
      status: "filled",
    });
    await expect(claimShift(boundaryNurse, await openShift(), EXPIRES_ON)).resolves.toMatchObject({
      status: "filled",
    });
  });

  it("rejects the day after the expiry date and writes nothing", async () => {
    const shiftId = await openShift();

    await expectHttpError(
      claimShift(boundaryNurse, shiftId, "2028-05-16"),
      403,
      "Credential expired, cannot claim shift",
    );

    const row = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
    expect(row.status).toBe("open");
    expect(row.claimedById).toBeNull();
    expect(await auditRowsFor(shiftId)).toHaveLength(0);
  });

  it("rejects an expired credential and leaves the shift and audit trail alone", async () => {
    const shiftId = await openShift();

    await expectHttpError(claimShift(expiredNurse, shiftId), 403, "Credential expired, cannot claim shift");

    expect((await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } })).status).toBe("open");
    expect(await auditRowsFor(shiftId)).toHaveLength(0);
  });

  it("rejects the seeded expired nurse on the seeded open shift without changing it", async () => {
    await expectHttpError(claimShift(james, "shift-1"), 403, "Credential expired, cannot claim shift");

    const row = await prisma.shift.findUniqueOrThrow({ where: { id: "shift-1" } });
    expect(row.status).toBe("open");
    expect(row.claimedById).toBeNull();
    expect(await auditRowsFor("shift-1")).toHaveLength(0);
  });

  it("rejects a nurse with no credential on file", async () => {
    const shiftId = await openShift();

    await expectHttpError(claimShift(missingNurse, shiftId), 403, "No credential on file, cannot claim shift");

    expect((await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } })).status).toBe("open");
    expect(await auditRowsFor(shiftId)).toHaveLength(0);
  });

  it("refuses an agency and the admin with 403", async () => {
    const shiftId = await openShift();

    await expectHttpError(claimShift(throwawayAgency, shiftId), 403, "Only nurses can claim shifts");
    await expectHttpError(claimShift(admin, shiftId), 403, "Only nurses can claim shifts");

    expect((await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } })).status).toBe("open");
  });

  it("answers an unknown shift with 404", async () => {
    await expectHttpError(claimShift(validNurse, `shift-${randomUUID()}`), 404, "Shift not found");
  });

  it("answers a filled shift with 409, including the claimer's own", async () => {
    const shiftId = await openShift();
    await claimShift(racerOne, shiftId);

    await expectHttpError(claimShift(racerTwo, shiftId), 409, "Shift is no longer available");
    await expectHttpError(claimShift(racerOne, shiftId), 409, "Shift is no longer available");

    expect(await auditRowsFor(shiftId)).toHaveLength(1);
  });

  it("checks the credential before whether the shift exists", async () => {
    await expectHttpError(
      claimShift(expiredNurse, `shift-${randomUUID()}`),
      403,
      "Credential expired, cannot claim shift",
    );
  });

  it("gives exactly one of two concurrent claims the shift", async () => {
    for (let round = 0; round < 5; round += 1) {
      const shiftId = await openShift();

      const results = await Promise.allSettled([claimShift(racerOne, shiftId), claimShift(racerTwo, shiftId)]);

      const winners = results.filter((result) => result.status === "fulfilled");
      const losers = results.filter((result) => result.status === "rejected");
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      const loser = (losers[0] as PromiseRejectedResult).reason;
      expect(loser).toBeInstanceOf(HttpError);
      expect((loser as HttpError).status).toBe(409);

      const winnerId = (winners[0] as PromiseFulfilledResult<{ claimedBy: string | null }>).value.claimedBy;
      const row = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
      expect(row.claimedById).toBe(winnerId);
      const events = await auditRowsFor(shiftId);
      expect(events).toHaveLength(1);
      expect(events[0].actorId).toBe(winnerId);
    }
  }, 60_000);
});

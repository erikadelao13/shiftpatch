import { expect } from "vitest";

import { fixtureCredentials, fixtureShifts } from "../../prisma/fixtures";
import { getPrisma } from "@/server/db";
import { HttpError } from "@/server/errors";

export async function expectHttpError(promise: Promise<unknown>, status: number, message?: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  if (message) expect((error as HttpError).message).toBe(message);
}

export async function assertSeededState(): Promise<void> {
  const prisma = getPrisma();
  const nurseIds = fixtureCredentials.map((c) => c.nurseId);
  const [shifts, credentials, documents] = await Promise.all([
    prisma.shift.findMany({ where: { id: { in: fixtureShifts.map((shift) => shift.id) } } }),
    prisma.credential.findMany({ where: { nurseId: { in: nurseIds } } }),
    prisma.credentialDocument.count({ where: { credential: { nurseId: { in: nurseIds } } } }),
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
  if (!shiftsMatch || !credentialsMatch || documents > 0) {
    throw new Error("The seeded shifts or credentials are missing or changed, or a seeded nurse has a document. Run `pnpm db:seed` first.");
  }
}

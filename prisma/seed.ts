import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/features/auth/server/password";
import { assertDevBranch, assertProductionSeed, isProductionSeed } from "./branch-guard";
import {
  FIXTURE_PASSWORD,
  fixtureAgencies,
  fixtureCredentials,
  fixtureShifts,
  fixtureUsers,
} from "./fixtures";

const production = isProductionSeed(process.argv);

// `.env` holds production; a dev seed loads the development files over it, and
// the production seed loads `.env` alone.
loadEnvConfig(process.cwd(), !production);

async function main() {
  if (production) assertProductionSeed();
  else assertDevBranch("seed the database");

  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is not set.");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    for (const agency of fixtureAgencies) {
      await prisma.agency.upsert({
        where: { id: agency.id },
        update: { name: agency.name },
        create: agency,
      });
    }

    for (const user of fixtureUsers) {
      const passwordHash = await hashPassword(FIXTURE_PASSWORD);
      await prisma.user.upsert({
        where: { id: user.id },
        update: { ...user, passwordHash },
        create: { ...user, passwordHash },
      });
    }

    await prisma.cancellation.deleteMany({
      where: { shiftId: { in: fixtureShifts.map((shift) => shift.id) } },
    });

    for (const shift of fixtureShifts) {
      const data = { ...shift, date: new Date(shift.date) };
      await prisma.shift.upsert({
        where: { id: shift.id },
        update: data,
        create: data,
      });
    }

    await prisma.credentialDocument.deleteMany({
      where: { credential: { nurseId: { in: fixtureCredentials.map((c) => c.nurseId) } } },
    });

    for (const credential of fixtureCredentials) {
      const data = { ...credential, expiresOn: new Date(credential.expiresOn) };
      await prisma.credential.upsert({
        where: { nurseId: credential.nurseId },
        update: data,
        create: data,
      });
    }

    console.log(
      `Seeded ${fixtureAgencies.length} agencies, ${fixtureUsers.length} users, ${fixtureShifts.length} shifts and ${fixtureCredentials.length} credentials on branch "${process.env.NEON_BRANCH}".`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

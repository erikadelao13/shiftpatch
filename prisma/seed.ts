import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/features/auth/server/password";
import { assertDevBranch } from "./branch-guard";
import { FIXTURE_PASSWORD, fixtureAgencies, fixtureUsers } from "./fixtures";

// `.env` holds production; load the development files over it.
loadEnvConfig(process.cwd(), true);

async function main() {
  assertDevBranch("seed the database");

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

    console.log(
      `Seeded ${fixtureAgencies.length} agencies and ${fixtureUsers.length} users on branch "${process.env.NEON_BRANCH}".`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

import { assertDevBranch, devOnlyPrismaCommand } from "./prisma/branch-guard";

// `.env` holds the production branch, so the Prisma CLI opts into
// `.env.development` (dev branch) unless the caller sets NODE_ENV=production.
const production = process.env.NODE_ENV === "production";
loadEnvConfig(process.cwd(), !production);

const argv = process.argv;
const devOnly = devOnlyPrismaCommand(argv);
if (devOnly) {
  assertDevBranch(`run \`prisma ${devOnly}\``);
}
if (argv.slice(2).join(" ").startsWith("migrate deploy") && !production) {
  throw new Error(
    "Refusing to run `prisma migrate deploy` without NODE_ENV=production. It belongs to the deployment plan; use `pnpm db:migrate` for the dev branch.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use the direct connection. Read it without `env()`, which
    // throws when unset, so `prisma generate` works with no database.
    url: process.env.DATABASE_URL_UNPOOLED,
  },
});

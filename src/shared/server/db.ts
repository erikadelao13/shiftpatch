import "server-only";

import { attachDatabasePool } from "@vercel/functions/db-connections";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

// One node-postgres pool per server instance, over Neon's pooled
// DATABASE_URL. Migrations use DATABASE_URL_UNPOOLED instead (ARCHITECTURE.md §12).
// Kept on globalThis so `next dev` reloads reuse it instead of leaking pools.
const globalForDb = globalThis as typeof globalThis & {
  dbPool?: Pool;
  prismaClient?: PrismaClient;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Run `neon env pull` or `neon deploy`.");
  }

  const pool = new Pool({ connectionString });
  // An idle client can be dropped server-side (Neon scale-to-zero, restarts).
  // Without a listener, node-postgres rethrows that and crashes the process.
  pool.on("error", (error) => {
    console.error("Idle Postgres client error:", error.message);
  });
  // Lets Vercel Fluid compute close idle clients before suspending the
  // instance. It does nothing off Vercel.
  attachDatabasePool(pool);
  return pool;
}

// Created lazily so importing this module never needs DATABASE_URL, e.g. at build.
export function getDb(): Pool {
  globalForDb.dbPool ??= createPool();
  return globalForDb.dbPool;
}

export function getPrisma(): PrismaClient {
  globalForDb.prismaClient ??= new PrismaClient({
    adapter: new PrismaPg(getDb()),
  });
  return globalForDb.prismaClient;
}

export async function pingDatabase(): Promise<void> {
  await getDb().query("select 1");
}

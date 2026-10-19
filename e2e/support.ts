import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { hashPassword } from "../src/server/auth/password";
import { assertDevBranch } from "../prisma/branch-guard";

// Playwright's own process doesn't load Next's env files. The dev server it
// starts reads `.env.development`; this loads the same file for cleanup.
loadEnvConfig(process.cwd(), true);

export const PASSWORD = "Trial2026!";

export const accounts = [
  { email: "admin@sunrisehealth.example", id: "agency-a", name: "Sunrise Health Staffing", role: "agency" },
  { email: "admin@metrocare.example", id: "agency-b", name: "Metro Care Partners", role: "agency" },
  { email: "maria.lopez@example.com", id: "nurse-1", name: "Maria Lopez", role: "nurse" },
  { email: "james.cook@example.com", id: "nurse-2", name: "James Cook", role: "nurse" },
  { email: "alex.kim@example.com", id: "admin-1", name: "Alex Kim", role: "admin" },
] as const;

// Only for cleanup; nothing trusts it.
export function sessionIdOf(token: string): string | undefined {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return typeof payload.sid === "string" ? payload.sid : undefined;
  } catch {
    return undefined;
  }
}

export type ThrowawayNurse = { id: string; email: string; name: string };

export async function createNurse(options: { expiresOn: string }): Promise<ThrowawayNurse> {
  assertDevBranch("create an end-to-end test nurse");
  const id = `test-${randomUUID()}`;
  const nurse = { id, email: `${id}@example.test`, name: "Throwaway Nurse" };
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  try {
    await pool.query(
      'insert into "User" (id, email, name, role, "passwordHash") values ($1, $2, $3, \'nurse\', $4)',
      [nurse.id, nurse.email, nurse.name, await hashPassword(PASSWORD)],
    );
    await pool.query(
      'insert into "Credential" (id, "nurseId", "expiresOn", "updatedAt") values ($1, $2, $3, now())',
      [randomUUID(), nurse.id, options.expiresOn],
    );
  } finally {
    await pool.end();
  }
  return nurse;
}

export async function deleteOwnRows(rows: {
  sessionIds?: string[];
  emails?: string[];
  shiftIds?: string[];
  userIds?: string[];
}): Promise<void> {
  const sessionIds = rows.sessionIds ?? [];
  const emails = rows.emails ?? [];
  const shiftIds = rows.shiftIds ?? [];
  const userIds = rows.userIds ?? [];
  if (
    sessionIds.length === 0 &&
    emails.length === 0 &&
    shiftIds.length === 0 &&
    userIds.length === 0
  ) {
    return;
  }

  assertDevBranch("clean up end-to-end test rows");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  try {
    if (shiftIds.length > 0) {
      await pool.query('delete from "AuditEvent" where "resourceId" = any($1::text[])', [shiftIds]);
      await pool.query('delete from "Shift" where id = any($1::text[])', [shiftIds]);
    }
    if (userIds.length > 0) {
      await pool.query('delete from "AuditEvent" where "actorId" = any($1::text[])', [userIds]);
      await pool.query('delete from "User" where id = any($1::text[])', [userIds]);
    }
    if (sessionIds.length > 0) {
      await pool.query('delete from "ApiSession" where id = any($1::text[])', [sessionIds]);
    }
    if (emails.length > 0) {
      await pool.query('delete from "LoginAttempt" where email = any($1::text[])', [emails]);
    }
  } finally {
    await pool.end();
  }
}

import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

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

export async function deleteOwnRows(rows: {
  sessionIds?: string[];
  emails?: string[];
  shiftIds?: string[];
}): Promise<void> {
  const sessionIds = rows.sessionIds ?? [];
  const emails = rows.emails ?? [];
  const shiftIds = rows.shiftIds ?? [];
  if (sessionIds.length === 0 && emails.length === 0 && shiftIds.length === 0) return;

  assertDevBranch("clean up end-to-end test rows");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  try {
    if (shiftIds.length > 0) {
      await pool.query('delete from "AuditEvent" where "resourceId" = any($1::text[])', [shiftIds]);
      await pool.query('delete from "Shift" where id = any($1::text[])', [shiftIds]);
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

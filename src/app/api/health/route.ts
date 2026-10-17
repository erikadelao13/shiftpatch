import { connection } from "next/server";

import { pingDatabase } from "@/shared/server/db";

const noStore = { "Cache-Control": "no-store" };

// Reports whether the app can reach its database. The response never carries
// the failure cause, which could expose connection details; the server log does.
export async function GET() {
  // Keep the query out of build-time prerendering.
  await connection();

  try {
    await pingDatabase();
    return Response.json({ status: "ok" }, { headers: noStore });
  } catch (error) {
    console.error(
      "Health check: database unreachable:",
      error instanceof Error ? error.message : error,
    );
    return Response.json(
      { error: "Database unavailable" },
      { status: 503, headers: noStore },
    );
  }
}

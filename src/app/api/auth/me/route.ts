import { connection } from "next/server";

import { requireActor } from "@/server/auth/request-auth";
import { errorResponse } from "@/server/errors";

export async function GET(request: Request) {
  // Keep the guard out of build-time prerendering.
  await connection();

  try {
    const actor = await requireActor(request);
    return Response.json(
      { user: actor },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

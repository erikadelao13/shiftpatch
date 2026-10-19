import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/server/auth/constants";
import { requireSession } from "@/server/auth/request-auth";
import { revokeSession } from "@/server/auth/sessions";
import { errorResponse } from "@/server/errors";

export async function POST(request: Request) {
  try {
    const { sessionId, source } = await requireSession(request);
    await revokeSession(sessionId);

    const response = new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
    if (source === "cookie") response.cookies.delete(SESSION_COOKIE);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

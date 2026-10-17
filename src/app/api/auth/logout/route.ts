import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/features/auth/constants";
import { requireSession } from "@/features/auth/server/request-auth";
import { revokeSession } from "@/features/auth/server/sessions";
import { errorResponse } from "@/shared/server/errors";

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

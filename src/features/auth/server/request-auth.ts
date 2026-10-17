import "server-only";

import { HttpError } from "@/shared/server/errors";

import { SESSION_COOKIE } from "../constants";
import type { Actor } from "../types";
import { resolveSession } from "./sessions";
import { verifyToken } from "./token";

export type AuthenticatedRequest = {
  actor: Actor;
  sessionId: string;
  source: "bearer" | "cookie";
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const UNAUTHENTICATED = "Authentication required";
const INVALID_TOKEN = "Invalid or expired token";

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index !== -1 && part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return undefined;
}

// A cookie-authenticated unsafe request must come from our own origin.
function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (originHost !== host) {
    throw new HttpError(403, "Cross-origin request rejected");
  }
}

// The one guard every authenticated route calls.
//  - An Authorization header must hold a valid Bearer token. An invalid one is
//    a 401 and never falls back to the cookie.
//  - Otherwise the session cookie is used, with an Origin check on unsafe methods.
//  - With neither, 401.
export async function requireSession(
  request: Request,
): Promise<AuthenticatedRequest> {
  const authorization = request.headers.get("authorization");

  let token: string | undefined;
  let source: AuthenticatedRequest["source"];

  if (authorization !== null) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    if (!match) throw new HttpError(401, INVALID_TOKEN);
    token = match[1];
    source = "bearer";
  } else {
    token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
    if (!token) throw new HttpError(401, UNAUTHENTICATED);
    source = "cookie";
    if (!SAFE_METHODS.has(request.method.toUpperCase())) {
      assertSameOrigin(request);
    }
  }

  const claims = await verifyToken(token);
  if (!claims) throw new HttpError(401, INVALID_TOKEN);

  const actor = await resolveSession(claims);
  if (!actor) throw new HttpError(401, INVALID_TOKEN);

  return { actor, sessionId: claims.sessionId, source };
}

export async function requireActor(request: Request): Promise<Actor> {
  return (await requireSession(request)).actor;
}

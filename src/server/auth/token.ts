import { jwtVerify, SignJWT } from "jose";

import {
  SESSION_TTL_SECONDS,
  TOKEN_AUDIENCE,
  TOKEN_ISSUER,
} from "./constants";
import { ROLES, type Role } from "@/contracts/auth/types";

// No Prisma and no `server-only`: the proxy imports this file.
export type TokenClaims = {
  userId: string;
  sessionId: string;
  role: Role;
};

function signingKey(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(
  claims: TokenClaims,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ sid: claims.sessionId, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(signingKey());
}

export function newSessionExpiry(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
}

// Does not know whether the session was revoked; `resolveSession` does.
export async function verifyToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      requiredClaims: ["sub", "exp"],
    });
    const { sub, sid, role } = payload;
    if (
      typeof sub !== "string" ||
      typeof sid !== "string" ||
      typeof role !== "string" ||
      !ROLES.includes(role as Role)
    ) {
      return null;
    }
    return { userId: sub, sessionId: sid, role: role as Role };
  } catch {
    return null;
  }
}

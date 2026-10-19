import "server-only";

import { getPrisma } from "@/server/db";

import type { Actor } from "@/contracts/auth/types";
import { newSessionExpiry, type TokenClaims } from "./token";

export async function createSession(
  userId: string,
): Promise<{ sessionId: string; expiresAt: Date }> {
  const expiresAt = newSessionExpiry();
  const session = await getPrisma().apiSession.create({
    data: { userId, expiresAt },
    select: { id: true },
  });
  return { sessionId: session.id, expiresAt };
}

// The actor comes from the database, not from the token.
export async function resolveSession(
  claims: TokenClaims,
): Promise<Actor | null> {
  const session = await getPrisma().apiSession.findUnique({
    where: { id: claims.sessionId },
    select: {
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: { id: true, name: true, role: true, agencyId: true },
      },
    },
  });
  if (
    !session ||
    session.userId !== claims.userId ||
    session.revokedAt !== null ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }
  return session.user;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await getPrisma().apiSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

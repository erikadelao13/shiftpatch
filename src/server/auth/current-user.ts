import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "./constants";
import type { Actor } from "@/contracts/auth/types";
import { resolveSession } from "./sessions";
import { verifyToken } from "./token";

import { workspacePathFor } from "@/contracts/auth/workspace";

export { workspacePathFor };

// Reads the request, so callers render it inside <Suspense>.
export const getOptionalUser = cache(async (): Promise<Actor | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = token ? await verifyToken(token) : null;
  return claims ? await resolveSession(claims) : null;
});

export async function getCurrentUser(): Promise<Actor> {
  const actor = await getOptionalUser();
  if (!actor) redirect("/login");
  return actor;
}

export async function requireRole(role: Actor["role"]): Promise<Actor> {
  const actor = await getCurrentUser();
  if (actor.role !== role) redirect(workspacePathFor(actor.role));
  return actor;
}

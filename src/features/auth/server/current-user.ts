import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "../constants";
import type { Actor } from "../types";
import { resolveSession } from "./sessions";
import { verifyToken } from "./token";

import { workspacePathFor } from "../workspace";

export { workspacePathFor };

// The signed-in user, or null: cookie, then database. It reads the request, so
// callers render it inside <Suspense>. Deduplicated per render.
export const getOptionalUser = cache(async (): Promise<Actor | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = token ? await verifyToken(token) : null;
  return claims ? await resolveSession(claims) : null;
});

// The authoritative page-level check: the signed-in user, otherwise /login.
export async function getCurrentUser(): Promise<Actor> {
  const actor = await getOptionalUser();
  if (!actor) redirect("/login");
  return actor;
}

// A workspace page's role check: another role's user goes to their own
// workspace.
export async function requireRole(role: Actor["role"]): Promise<Actor> {
  const actor = await getCurrentUser();
  if (actor.role !== role) redirect(workspacePathFor(actor.role));
  return actor;
}

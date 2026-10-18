import "server-only";

import type { Actor } from "@/features/auth/types";

export function canPostShift(actor: Actor): boolean {
  return actor.role === "agency" && actor.agencyId !== null;
}

export function canReadAgencyShifts(actor: Actor, agencyId: string): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "agency" && actor.agencyId === agencyId;
}

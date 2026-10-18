import "server-only";

import type { Actor } from "@/features/auth/types";
import type { CredentialStatus } from "@/features/credentials/status";

export function canPostShift(actor: Actor): boolean {
  return actor.role === "agency" && actor.agencyId !== null;
}

export function canReadAgencyShifts(actor: Actor, agencyId: string): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "agency" && actor.agencyId === agencyId;
}

export function canClaimShift(actor: Actor): boolean {
  return actor.role === "nurse";
}

export function credentialClaimError(status: CredentialStatus): string | null {
  switch (status.state) {
    case "valid":
      return null;
    case "expired":
      return "Credential expired, cannot claim shift";
    case "missing":
      return "No credential on file, cannot claim shift";
  }
}

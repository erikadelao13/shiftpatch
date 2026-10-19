import "server-only";

import type { Actor } from "@/contracts/auth/types";
import type { CredentialStatus } from "@/contracts/credentials/status";

import type { ShiftStatus } from "@/contracts/shifts/types";

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

export function canRecordNoShow(actor: Actor): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "agency" && actor.agencyId !== null;
}

export type CancellationRefusal = { status: 403 | 409; message: string };

export function cancellationRefusal(
  actor: Actor,
  shift: { agencyId: string; status: ShiftStatus; claimedById: string | null },
): CancellationRefusal | null {
  if (actor.role === "agency" && actor.agencyId !== shift.agencyId) {
    return { status: 403, message: "You can only cancel your own agency's shifts" };
  }
  if (shift.status === "open") {
    return { status: 409, message: "Shift has no active assignment" };
  }
  if (actor.role === "nurse" && shift.claimedById !== actor.id) {
    return { status: 403, message: "You can only cancel your own shifts" };
  }
  return null;
}

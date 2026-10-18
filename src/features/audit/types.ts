import type { Role } from "@/features/auth/types";
import type { CancellationReason, ShiftRole } from "@/features/shifts/types";

export type AuditPerson = { id: string; name: string };

type AuditEntryBase = {
  id: string;
  occurredAt: string;
  actor: AuditPerson & { role: Role };
  recordId: string;
};

export type AuditEntry = AuditEntryBase &
  (
    | { action: "shift_posted"; shift: { role: ShiftRole; date: string } }
    | { action: "shift_claimed" }
    | { action: "shift_cancelled"; reason: CancellationReason; previousNurse: AuditPerson }
    | { action: "credential_updated"; previousExpiresOn: string | null; expiresOn: string }
  );

import "server-only";

import { z } from "zod";

import type { AuditAction } from "@/generated/prisma/client";
import type { Role } from "@/features/auth/types";
import { CANCELLATION_REASONS, SHIFT_ROLES } from "@/features/shifts/types";

import type { AuditEntry } from "../types";

export type AuditRow = {
  id: string;
  action: AuditAction;
  resourceId: string;
  metadata: unknown;
  createdAt: Date;
  actorId: string;
  actor: { id: string; name: string; role: Role };
};

const shiftPostedMetadata = z.object({
  agencyId: z.string(),
  role: z.enum(SHIFT_ROLES),
  date: z.iso.date(),
});

const shiftClaimedMetadata = z.object({ agencyId: z.string() });

const shiftCancelledMetadata = z.object({
  agencyId: z.string(),
  reason: z.enum(CANCELLATION_REASONS),
  previousNurseId: z.string(),
});

const credentialUpdatedMetadata = z.object({
  nurseId: z.string().optional(),
  previousExpiresOn: z.iso.date().nullable(),
  expiresOn: z.iso.date(),
});

export function previousNurseIds(rows: AuditRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.action === "shift_cancelled") {
      ids.add(shiftCancelledMetadata.parse(row.metadata).previousNurseId);
    }
  }
  return [...ids];
}

export function toAuditEntry(row: AuditRow, nurseNames: ReadonlyMap<string, string>): AuditEntry {
  const base = {
    id: row.id,
    occurredAt: row.createdAt.toISOString(),
    actor: { id: row.actor.id, name: row.actor.name, role: row.actor.role },
    recordId: row.resourceId,
  };

  switch (row.action) {
    case "shift_posted": {
      const { role, date } = shiftPostedMetadata.parse(row.metadata);
      return { ...base, action: row.action, shift: { role, date } };
    }
    case "shift_claimed":
      shiftClaimedMetadata.parse(row.metadata);
      return { ...base, action: row.action };
    case "shift_cancelled": {
      const { reason, previousNurseId } = shiftCancelledMetadata.parse(row.metadata);
      return {
        ...base,
        action: row.action,
        reason,
        previousNurse: {
          id: previousNurseId,
          name: nurseNames.get(previousNurseId) ?? previousNurseId,
        },
      };
    }
    case "credential_updated": {
      const { nurseId, previousExpiresOn, expiresOn } = credentialUpdatedMetadata.parse(
        row.metadata,
      );
      return {
        ...base,
        action: row.action,
        recordId: nurseId ?? row.actorId,
        previousExpiresOn,
        expiresOn,
      };
    }
  }
}

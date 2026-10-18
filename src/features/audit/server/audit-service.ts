import "server-only";

import type { AuditAction, Prisma } from "@/generated/prisma/client";

export type AuditEventInput = {
  actorId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordAuditEvent(
  tx: Prisma.TransactionClient,
  event: AuditEventInput,
): Promise<void> {
  await tx.auditEvent.create({ data: event });
}

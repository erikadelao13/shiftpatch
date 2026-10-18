import "server-only";

import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/server/db";

import type { AuditEntry } from "../types";
import { previousNurseIds, toAuditEntry, type AuditRow } from "./audit-presenter";

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

export async function listAuditEntries(
  limit = 50,
): Promise<{ entries: AuditEntry[]; total: number }> {
  const prisma = getPrisma();
  const [rows, total] = await Promise.all([
    prisma.auditEvent.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      include: { actor: { select: { id: true, name: true, role: true } } },
    }),
    prisma.auditEvent.count(),
  ]);
  const auditRows: AuditRow[] = rows;

  const nurses = await prisma.user.findMany({
    where: { id: { in: previousNurseIds(auditRows) } },
    select: { id: true, name: true },
  });
  const nurseNames = new Map(nurses.map((nurse) => [nurse.id, nurse.name]));

  return { entries: auditRows.map((row) => toAuditEntry(row, nurseNames)), total };
}

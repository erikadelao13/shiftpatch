import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/server/db";

export async function getCredentialExpiry(
  nurseId: string,
  db: Prisma.TransactionClient = getPrisma(),
): Promise<string | null> {
  const credential = await db.credential.findUnique({
    where: { nurseId },
    select: { expiresOn: true },
  });
  return credential?.expiresOn.toISOString().slice(0, 10) ?? null;
}

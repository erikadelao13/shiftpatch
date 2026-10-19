import "server-only";

import type { Actor } from "@/contracts/auth/types";
import { recordAuditEvent } from "@/server/audit/audit-service";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db";
import { HttpError } from "@/server/errors";

import { DOCUMENT_MIME_TYPES, PAST_EXPIRY_MESSAGE, cleanFileName, detectDocumentType } from "@/contracts/credentials/document";
import { getCredentialStatus, todayIsoDate } from "@/contracts/credentials/status";
import type { CredentialDocumentSummary, CredentialDTO, CredentialRecord } from "@/contracts/credentials/types";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const documentSummarySelect = {
  fileName: true,
  type: true,
  sizeBytes: true,
  uploadedAt: true,
} as const;

function toDocumentSummary(row: {
  fileName: string;
  type: keyof typeof DOCUMENT_MIME_TYPES;
  sizeBytes: number;
  uploadedAt: Date;
}): CredentialDocumentSummary {
  return {
    fileName: row.fileName,
    contentType: DOCUMENT_MIME_TYPES[row.type],
    sizeBytes: row.sizeBytes,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export async function getCredentialExpiry(
  nurseId: string,
  db: Prisma.TransactionClient = getPrisma(),
): Promise<string | null> {
  const credential = await db.credential.findUnique({
    where: { nurseId },
    select: { expiresOn: true },
  });
  return credential ? isoDate(credential.expiresOn) : null;
}

export async function getCredentialRecord(nurseId: string): Promise<CredentialRecord> {
  const credential = await getPrisma().credential.findUnique({
    where: { nurseId },
    select: { expiresOn: true, document: { select: documentSummarySelect } },
  });
  if (!credential) return { expiresOn: null, document: null };
  return {
    expiresOn: isoDate(credential.expiresOn),
    document: credential.document ? toDocumentSummary(credential.document) : null,
  };
}

export async function saveCredential(
  actor: Actor,
  input: { file: File; expiresOn: string },
  today: string = todayIsoDate(),
): Promise<CredentialDTO> {
  if (actor.role !== "nurse") {
    throw new HttpError(403, "Only nurses can upload credentials");
  }
  if (input.expiresOn < today) {
    throw new HttpError(400, PAST_EXPIRY_MESSAGE);
  }
  const content = new Uint8Array(await input.file.arrayBuffer());
  const type = detectDocumentType(content);
  if (!type) {
    throw new HttpError(400, "Choose a PDF, JPG or PNG file.");
  }
  const fileName = cleanFileName(input.file.name, type);

  return getPrisma().$transaction(
    async (tx) => {
      // Serializes saves for one nurse, first saves included, without
      // blocking claims, which only take FOR KEY SHARE on this row.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actor.id} FOR NO KEY UPDATE`;

      const previousExpiresOn = await getCredentialExpiry(actor.id, tx);
      const credential = await tx.credential.upsert({
        where: { nurseId: actor.id },
        create: { nurseId: actor.id, expiresOn: new Date(input.expiresOn) },
        update: { expiresOn: new Date(input.expiresOn) },
        select: { id: true },
      });
      const uploadedAt = new Date();
      const document = await tx.credentialDocument.upsert({
        where: { credentialId: credential.id },
        create: { credentialId: credential.id, fileName, type, sizeBytes: content.byteLength, content, uploadedAt },
        update: { fileName, type, sizeBytes: content.byteLength, content, uploadedAt },
        select: documentSummarySelect,
      });
      await recordAuditEvent(tx, {
        actorId: actor.id,
        action: "credential_updated",
        resourceType: "credential",
        resourceId: credential.id,
        metadata: { nurseId: actor.id, previousExpiresOn, expiresOn: input.expiresOn },
      });

      return {
        nurseId: actor.id,
        expiresOn: input.expiresOn,
        status: getCredentialStatus(input.expiresOn, today).state,
        document: toDocumentSummary(document),
      };
    },
    { timeout: 15_000, maxWait: 5_000 },
  );
}

export async function getCredentialDocument(
  actor: Actor,
): Promise<{ fileName: string; contentType: string; content: Uint8Array<ArrayBuffer> }> {
  if (actor.role !== "nurse") {
    throw new HttpError(403, "Only nurses can view credential documents");
  }
  const document = await getPrisma().credentialDocument.findFirst({
    where: { credential: { nurseId: actor.id } },
    select: { fileName: true, type: true, content: true },
  });
  if (!document) throw new HttpError(404, "No document on file");
  return {
    fileName: document.fileName,
    contentType: DOCUMENT_MIME_TYPES[document.type],
    content: document.content,
  };
}

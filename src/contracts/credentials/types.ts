import type { CredentialStatus } from "./status";

export type CredentialDocumentSummary = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type CredentialDTO = {
  nurseId: string;
  expiresOn: string;
  status: CredentialStatus["state"];
  document: CredentialDocumentSummary;
};

export type CredentialData = {
  status: CredentialStatus;
  document: CredentialDocumentSummary | null;
};

export type CredentialRecord = {
  expiresOn: string | null;
  document: CredentialDocumentSummary | null;
};

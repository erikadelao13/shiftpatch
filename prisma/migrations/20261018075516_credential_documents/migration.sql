-- CreateEnum
CREATE TYPE "CredentialDocumentType" AS ENUM ('pdf', 'jpeg', 'png');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'credential_updated';

-- CreateTable
CREATE TABLE "CredentialDocument" (
    "credentialId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "type" "CredentialDocumentType" NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialDocument_pkey" PRIMARY KEY ("credentialId")
);

-- AddForeignKey
ALTER TABLE "CredentialDocument" ADD CONSTRAINT "CredentialDocument_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The stored size must match the stored bytes.
ALTER TABLE "CredentialDocument" ADD CONSTRAINT "CredentialDocument_sizeBytes_matches_content" CHECK ("sizeBytes" = octet_length("content"));

-- Documents are 1 byte to 4 MB, the upload limit.
ALTER TABLE "CredentialDocument" ADD CONSTRAINT "CredentialDocument_sizeBytes_range" CHECK ("sizeBytes" BETWEEN 1 AND 4194304);

-- File names are 1 to 255 characters.
ALTER TABLE "CredentialDocument" ADD CONSTRAINT "CredentialDocument_fileName_length" CHECK (char_length("fileName") BETWEEN 1 AND 255);

-- PDF, JPEG and PNG are already compressed, so skip TOAST compression.
ALTER TABLE "CredentialDocument" ALTER COLUMN "content" SET STORAGE EXTERNAL;

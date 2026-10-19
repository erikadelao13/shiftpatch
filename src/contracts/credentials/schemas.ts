import { z } from "zod";

export const CREDENTIAL_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

// Vercel caps a function's request body at 4.5 MB, multipart overhead included.
export const MAX_CREDENTIAL_BYTES = 4 * 1024 * 1024;

export const credentialFileSchema = z
  .instanceof(File, { message: "Choose your credential document." })
  .refine((file) => file.name !== "" || file.size > 0, "Choose your credential document.")
  .refine((file) => file.size > 0, "This file is empty. Choose your credential document.")
  .refine(
    (file) => (CREDENTIAL_FILE_TYPES as readonly string[]).includes(file.type),
    "Choose a PDF, JPG or PNG file.",
  )
  .refine((file) => file.size <= MAX_CREDENTIAL_BYTES, "Choose a file of 4 MB or less.");

export const credentialUploadSchema = z.object({
  file: credentialFileSchema,
  expiresOn: z.iso.date("Enter the expiry date printed on your document."),
});

export type CredentialUploadErrors = Partial<Record<"file" | "expiresOn", string>>;

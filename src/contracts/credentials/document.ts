export type CredentialDocumentKind = "pdf" | "jpeg" | "png";

export const DOCUMENT_MIME_TYPES: Record<CredentialDocumentKind, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
};

const EXTENSIONS: Record<CredentialDocumentKind, string> = { pdf: "pdf", jpeg: "jpg", png: "png" };

const MAX_FILE_NAME_LENGTH = 255;

export const PAST_EXPIRY_MESSAGE = "Expiry date must be today or later.";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
}

export function detectDocumentType(bytes: Uint8Array): CredentialDocumentKind | null {
  if (startsWith(bytes, PDF_SIGNATURE)) return "pdf";
  if (startsWith(bytes, JPEG_SIGNATURE)) return "jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "png";
  return null;
}

export function cleanFileName(name: string, type: CredentialDocumentKind): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/\p{Cc}/gu, "").trim();
  const capped = Array.from(cleaned).slice(0, MAX_FILE_NAME_LENGTH).join("").trim();
  return capped || `credential.${EXTENSIONS[type]}`;
}

export function contentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\%]/g, "_");
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

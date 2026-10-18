import "server-only";

import { HttpError } from "./errors";

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

export function assertContentLength(request: Request, maxBytes: number): void {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError(413, "Choose a file of 4 MB or less.");
  }
}

export async function readFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new HttpError(400, "Send the document and expiry date as multipart/form-data.");
  }
}

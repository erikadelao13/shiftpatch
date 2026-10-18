import { requireActor } from "@/features/auth/server/request-auth";
import { contentDisposition } from "@/features/credentials/document";
import { getCredentialDocument } from "@/features/credentials/server/credential-service";
import { errorResponse } from "@/shared/server/errors";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const { fileName, contentType, content } = await getCredentialDocument(actor);
    return new Response(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(content.byteLength),
        "Content-Disposition": contentDisposition(fileName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

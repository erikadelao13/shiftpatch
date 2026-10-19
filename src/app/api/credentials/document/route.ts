import { requireActor } from "@/server/auth/request-auth";
import { contentDisposition } from "@/contracts/credentials/document";
import { getCredentialDocument } from "@/server/credentials/credential-service";
import { errorResponse } from "@/server/errors";

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

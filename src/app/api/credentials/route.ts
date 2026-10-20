import { requireActor, requireActorRole } from "@/server/auth/request-auth";
import { MAX_CREDENTIAL_BYTES, credentialUploadSchema } from "@/contracts/credentials/schemas";
import { getCredentialData, saveCredential } from "@/server/credentials/credential-service";
import { HttpError, errorResponse } from "@/server/errors";
import { assertContentLength, readFormData } from "@/server/http";

const noStore = { "Cache-Control": "no-store" };
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export async function GET(request: Request) {
  try {
    const actor = await requireActorRole(request, "nurse", "Only nurses can view credentials");
    return Response.json(await getCredentialData(actor.id), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    if (actor.role !== "nurse") {
      throw new HttpError(403, "Only nurses can upload credentials");
    }
    assertContentLength(request, MAX_CREDENTIAL_BYTES + MULTIPART_OVERHEAD_BYTES);
    const form = await readFormData(request);
    const input = credentialUploadSchema.parse({
      file: form.get("file"),
      expiresOn: form.get("expiresOn"),
    });
    return Response.json(await saveCredential(actor, input), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

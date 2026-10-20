import { listAuditEntries } from "@/server/audit/audit-service";
import { errorResponse } from "@/server/errors";
import { requireActorRole } from "@/server/auth/request-auth";

export async function GET(request: Request) {
  try {
    await requireActorRole(request, "admin", "Only administrators can read the audit log");
    return Response.json(await listAuditEntries(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

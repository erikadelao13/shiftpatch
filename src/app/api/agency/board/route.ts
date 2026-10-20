import { HttpError, errorResponse } from "@/server/errors";
import { requireActorRole } from "@/server/auth/request-auth";
import { getAgencyBoard } from "@/server/shifts/shift-service";

export async function GET(request: Request) {
  try {
    const actor = await requireActorRole(request, "agency", "Only agencies can read the agency board");
    if (!actor.agencyId) throw new HttpError(403, "This account has no agency");
    const shifts = await getAgencyBoard(actor.agencyId);
    return Response.json({ shifts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

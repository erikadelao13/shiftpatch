import { requireActor } from "@/server/auth/request-auth";
import { listAgencyShifts } from "@/server/shifts/shift-service";
import { errorResponse } from "@/server/errors";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/agencies/[agencyId]/shifts">,
) {
  try {
    const actor = await requireActor(request);
    const { agencyId } = await ctx.params;
    const shifts = await listAgencyShifts(actor, agencyId);
    return Response.json({ agencyId, shifts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

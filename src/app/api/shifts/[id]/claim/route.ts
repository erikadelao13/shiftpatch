import { requireActor } from "@/server/auth/request-auth";
import { claimShift } from "@/server/shifts/shift-service";
import { errorResponse } from "@/server/errors";

const noStore = { "Cache-Control": "no-store" };

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/shifts/[id]/claim">,
) {
  try {
    const actor = await requireActor(request);
    const { id } = await ctx.params;
    return Response.json(await claimShift(actor, id), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

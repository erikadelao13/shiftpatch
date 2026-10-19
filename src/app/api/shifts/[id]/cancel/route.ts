import { requireActor } from "@/server/auth/request-auth";
import { cancelShiftSchema } from "@/contracts/shifts/schemas";
import { cancelShift } from "@/server/shifts/shift-service";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/http";

const noStore = { "Cache-Control": "no-store" };

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/shifts/[id]/cancel">,
) {
  try {
    const actor = await requireActor(request);
    const { reason } = cancelShiftSchema.parse(await readJson(request));
    const { id } = await ctx.params;
    return Response.json(await cancelShift(actor, id, reason), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

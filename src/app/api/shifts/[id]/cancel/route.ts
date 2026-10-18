import { requireActor } from "@/features/auth/server/request-auth";
import { cancelShiftSchema } from "@/features/shifts/schemas";
import { cancelShift } from "@/features/shifts/server/shift-service";
import { errorResponse } from "@/shared/server/errors";
import { readJson } from "@/shared/server/http";

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

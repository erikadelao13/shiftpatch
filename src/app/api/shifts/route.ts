import { requireActor } from "@/features/auth/server/request-auth";
import { newShiftSchema } from "@/features/shifts/schemas";
import { createShift, listShifts } from "@/features/shifts/server/shift-service";
import { errorResponse } from "@/shared/server/errors";
import { readJson } from "@/shared/server/http";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    await requireActor(request);
    return Response.json({ shifts: await listShifts() }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const input = newShiftSchema.parse(await readJson(request));
    return Response.json(await createShift(actor, input), {
      status: 201,
      headers: noStore,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

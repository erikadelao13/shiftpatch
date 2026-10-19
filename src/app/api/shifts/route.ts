import { requireActor } from "@/server/auth/request-auth";
import { newShiftSchema } from "@/contracts/shifts/schemas";
import { createShift, listShifts } from "@/server/shifts/shift-service";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/http";

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

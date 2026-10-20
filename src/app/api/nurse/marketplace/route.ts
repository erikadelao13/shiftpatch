import { errorResponse } from "@/server/errors";
import { requireActorRole } from "@/server/auth/request-auth";
import { getNurseMarketplace } from "@/server/shifts/shift-service";

export async function GET(request: Request) {
  try {
    const actor = await requireActorRole(request, "nurse", "Only nurses can read the marketplace");
    return Response.json(await getNurseMarketplace(actor.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

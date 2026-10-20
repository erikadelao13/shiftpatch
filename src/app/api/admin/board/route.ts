import { errorResponse } from "@/server/errors";
import { requireActorRole } from "@/server/auth/request-auth";
import { getAdminBoard, listAgencies } from "@/server/shifts/shift-service";

export async function GET(request: Request) {
  try {
    await requireActorRole(request, "admin", "Only administrators can read the admin board");
    const [agencies, shifts] = await Promise.all([listAgencies(), getAdminBoard()]);
    return Response.json({ agencies, shifts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

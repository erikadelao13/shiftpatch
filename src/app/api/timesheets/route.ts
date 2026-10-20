import { HttpError, errorResponse } from "@/server/errors";
import { requireActor } from "@/server/auth/request-auth";
import { listTimesheetEntries, type TimesheetScope } from "@/server/timesheets/timesheet-service";
import type { Actor } from "@/contracts/auth/types";

function scopeFor(actor: Actor): TimesheetScope {
  switch (actor.role) {
    case "nurse":
      return { kind: "nurse", nurseId: actor.id };
    case "agency":
      if (!actor.agencyId) throw new HttpError(403, "This account has no agency");
      return { kind: "agency", agencyId: actor.agencyId };
    case "admin":
      return { kind: "all" };
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const entries = await listTimesheetEntries(scopeFor(actor));
    return Response.json({ entries }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

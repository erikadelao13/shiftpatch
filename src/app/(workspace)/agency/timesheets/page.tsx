import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { Timesheet } from "@/features/timesheets/components/timesheet";
import { listTimesheetEntries } from "@/server/timesheets/timesheet-service";

export default function AgencyTimesheetsPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AgencyTimesheetWorkspace />
    </Suspense>
  );
}

async function AgencyTimesheetWorkspace() {
  const user = await requireRole("agency");
  if (!user.agencyId) return <p className="text-text-muted">This account has no agency.</p>;

  const entries = await listTimesheetEntries({ kind: "agency", agencyId: user.agencyId });

  return <Timesheet audience="agency" entries={entries} />;
}

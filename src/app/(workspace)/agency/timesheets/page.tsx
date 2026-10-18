import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";
import { Timesheet } from "@/features/timesheets/components/timesheet";
import { listTimesheetEntries } from "@/features/timesheets/server/timesheet-service";

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

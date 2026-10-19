import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { Timesheet } from "@/features/timesheets/views/timesheet";
import { listTimesheetEntries } from "@/server/timesheets/timesheet-service";

export default function TimesheetsPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <TimesheetWorkspace />
    </Suspense>
  );
}

async function TimesheetWorkspace() {
  const user = await requireRole("nurse");
  const entries = await listTimesheetEntries({ kind: "nurse", nurseId: user.id });

  return <Timesheet audience="nurse" entries={entries} />;
}

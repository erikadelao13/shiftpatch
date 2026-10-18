import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";
import { Timesheet } from "@/features/timesheets/components/timesheet";
import { listTimesheetEntries } from "@/features/timesheets/server/timesheet-service";

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

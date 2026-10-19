import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { Timesheet } from "@/features/timesheets/views/timesheet";
import { listTimesheetEntries } from "@/server/timesheets/timesheet-service";

export default function AdminTimesheetsPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AdminTimesheetWorkspace />
    </Suspense>
  );
}

async function AdminTimesheetWorkspace() {
  await requireRole("admin");
  const entries = await listTimesheetEntries({ kind: "all" });

  return <Timesheet audience="admin" entries={entries} />;
}

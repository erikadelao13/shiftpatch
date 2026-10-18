import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";
import { Timesheet } from "@/features/timesheets/components/timesheet";
import { listTimesheetEntries } from "@/features/timesheets/server/timesheet-service";

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

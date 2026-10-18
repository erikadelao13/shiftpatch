import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";
import { getNurseMarketplace } from "@/features/shifts/server/shift-service";
import { Timesheet } from "@/features/timesheets/components/timesheet";

export default function TimesheetsPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <TimesheetWorkspace />
    </Suspense>
  );
}

async function TimesheetWorkspace() {
  const user = await requireRole("nurse");
  const { myShifts } = await getNurseMarketplace(user.id);

  return <Timesheet shifts={myShifts} />;
}

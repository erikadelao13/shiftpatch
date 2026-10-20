import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { timesheetsQuery } from "@/features/timesheets/queries/timesheets-query";
import { Timesheet } from "@/features/timesheets/views/timesheet";
import { makeQueryClient } from "@/shared/client/query-client";
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

  const queryClient = makeQueryClient();
  await queryClient.fetchQuery({
    ...timesheetsQuery(user.id, "nurse"),
    queryFn: () => listTimesheetEntries({ kind: "nurse", nurseId: user.id }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Timesheet audience="nurse" userId={user.id} />
    </HydrationBoundary>
  );
}

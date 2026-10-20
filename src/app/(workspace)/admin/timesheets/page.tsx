import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { timesheetsQuery } from "@/features/timesheets/queries/timesheets-query";
import { Timesheet } from "@/features/timesheets/views/timesheet";
import { makeQueryClient } from "@/shared/client/query-client";
import { listTimesheetEntries } from "@/server/timesheets/timesheet-service";

export default function AdminTimesheetsPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AdminTimesheetWorkspace />
    </Suspense>
  );
}

async function AdminTimesheetWorkspace() {
  const user = await requireRole("admin");

  const queryClient = makeQueryClient();
  await queryClient.fetchQuery({
    ...timesheetsQuery(user.id, "admin"),
    queryFn: () => listTimesheetEntries({ kind: "all" }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Timesheet audience="admin" userId={user.id} />
    </HydrationBoundary>
  );
}

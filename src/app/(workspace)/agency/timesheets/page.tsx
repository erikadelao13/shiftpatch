import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { timesheetsQuery } from "@/features/timesheets/queries/timesheets-query";
import { Timesheet } from "@/features/timesheets/views/timesheet";
import { makeQueryClient } from "@/shared/client/query-client";
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
  const agencyId = user.agencyId;
  if (!agencyId) return <p className="text-text-muted">This account has no agency.</p>;

  const queryClient = makeQueryClient();
  await queryClient.fetchQuery({
    ...timesheetsQuery(user.id, "agency"),
    queryFn: () => listTimesheetEntries({ kind: "agency", agencyId }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Timesheet audience="agency" userId={user.id} />
    </HydrationBoundary>
  );
}

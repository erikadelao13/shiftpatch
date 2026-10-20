import { useSuspenseQuery } from "@tanstack/react-query";

import type { Role } from "@/contracts/auth/types";
import { useQueryRefresh } from "@/shared/hooks/use-query-refresh";

import { formatHours, timesheetTotals } from "../lib/hours";
import { timesheetsQuery } from "../queries/timesheets-query";

export function useTimesheet(userId: string, audience: Role) {
  const query = useSuspenseQuery(timesheetsQuery(userId, audience));
  const refresh = useQueryRefresh(query, "Timesheet refreshed.");
  const totals = timesheetTotals(query.data);

  return {
    ...refresh,
    entries: query.data,
    totals,
    scheduledHours: formatHours(totals.scheduledHours),
  };
}

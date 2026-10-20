import { queryOptions } from "@tanstack/react-query";

import type { Role } from "@/contracts/auth/types";
import type { TimesheetEntry } from "@/contracts/timesheets/types";
import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";

export const timesheetsQuery = (userId: string, audience: Role) =>
  queryOptions({
    queryKey: queryKeys.timesheets(userId),
    queryFn: async () => (await apiFetch<{ entries: TimesheetEntry[] }>("/api/timesheets")).entries,
    refetchOnWindowFocus: audience === "admin" ? "always" : false,
  });

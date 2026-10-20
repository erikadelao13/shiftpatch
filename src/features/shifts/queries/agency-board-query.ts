import { queryOptions } from "@tanstack/react-query";

import type { AgencyShift } from "@/contracts/shifts/types";
import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";

export const agencyBoardQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.agencyBoard(userId),
    queryFn: async () => (await apiFetch<{ shifts: AgencyShift[] }>("/api/agency/board")).shifts,
  });

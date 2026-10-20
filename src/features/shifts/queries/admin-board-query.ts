import { queryOptions } from "@tanstack/react-query";

import type { AdminShift, AgencyOption } from "@/contracts/shifts/types";
import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";

export type AdminBoard = { agencies: AgencyOption[]; shifts: AdminShift[] };

export const adminBoardQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.adminBoard(userId),
    queryFn: () => apiFetch<AdminBoard>("/api/admin/board"),
    refetchOnWindowFocus: "always",
  });

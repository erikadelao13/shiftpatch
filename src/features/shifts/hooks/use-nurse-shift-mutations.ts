import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";

import type { MarketplaceShift, ShiftDTO } from "@/contracts/shifts/types";
import type { ReopenTarget } from "../lib/reopen";

export function useNurseShiftMutations(userId: string) {
  const queryClient = useQueryClient();

  const claim = useMutation({
    mutationFn: (shift: MarketplaceShift) =>
      apiFetch<ShiftDTO>(`/api/shifts/${shift.id}/claim`, { method: "POST" }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.marketplace(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timesheets(userId) });
    },
  });

  const cancel = useMutation({
    mutationFn: (shift: ReopenTarget) =>
      apiFetch<ShiftDTO>(`/api/shifts/${shift.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "advance" }),
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timesheets(userId) }),
      ]),
  });

  return { claim, cancel };
}

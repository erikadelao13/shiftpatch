import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";

import type { NewShiftInput } from "@/contracts/shifts/schemas";
import type { CancellationReason, ShiftDTO } from "@/contracts/shifts/types";
import type { ReopenTarget } from "../lib/reopen";

export function useAgencyShiftMutations(userId: string) {
  const queryClient = useQueryClient();

  const post = useMutation({
    mutationFn: (input: NewShiftInput) =>
      apiFetch<ShiftDTO>("/api/shifts", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.agencyBoard(userId) }),
  });

  const cancel = useMutation({
    mutationFn: ({ shift, reason }: { shift: ReopenTarget; reason: CancellationReason }) =>
      apiFetch<ShiftDTO>(`/api/shifts/${shift.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.agencyBoard(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timesheets(userId) }),
      ]),
  });

  return { post, cancel };
}

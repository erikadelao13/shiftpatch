import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { formatDate } from "@/shared/lib/dates";

import type { MarketplaceShift } from "@/contracts/shifts/types";
import type { ReopenTarget } from "../lib/reopen";
import { marketplaceQuery } from "../queries/marketplace-query";
import { useMarketplaceFilters } from "./use-marketplace-filters";
import { useNurseShiftMutations } from "./use-nurse-shift-mutations";

type Notice = { kind: "success" | "error"; message: string };

export function useMarketplace(userId: string) {
  const {
    data: { openShifts, myShifts },
    isFetching,
  } = useSuspenseQuery(marketplaceQuery(userId));
  const mutations = useNurseShiftMutations(userId);
  const filters = useMarketplaceFilters(openShifts);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReopenTarget | null>(null);

  async function claim(shift: MarketplaceShift) {
    setNotice(null);
    try {
      await mutations.claim.mutateAsync(shift);
      setNotice({
        kind: "success",
        message: `Shift claimed: ${shift.role} on ${formatDate(shift.date)} with ${shift.agencyName}`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not claim this shift.",
      });
    }
  }

  function startCancel(shift: MarketplaceShift) {
    setNotice(null);
    setCancelTarget({ ...shift, nurseName: null });
  }

  async function cancelAssignment(shift: ReopenTarget) {
    setNotice(null);
    await mutations.cancel.mutateAsync(shift);
    setNotice({
      kind: "success",
      message: `Assignment cancelled: ${shift.role} on ${formatDate(shift.date)} with ${shift.agencyName}. The shift is open again.`,
    });
  }

  return {
    ...filters,
    myShifts,
    notice,
    dismissNotice: () => setNotice(null),
    claim,
    claimingId: mutations.claim.isPending ? mutations.claim.variables.id : null,
    claimsLocked: mutations.claim.isPending || isFetching,
    cancelTarget,
    startCancel,
    closeCancelDialog: () => setCancelTarget(null),
    cancelAssignment,
  };
}

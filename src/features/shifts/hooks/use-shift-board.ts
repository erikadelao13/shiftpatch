import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { formatDate } from "@/shared/lib/dates";

import type { NewShiftInput } from "@/contracts/shifts/schemas";
import type { AgencyShift, CancellationReason } from "@/contracts/shifts/types";
import { ALL } from "../lib/filters";
import type { ReopenTarget } from "../lib/reopen";
import { summarize } from "../lib/schedule";
import { agencyBoardQuery } from "../queries/agency-board-query";
import { useAgencyShiftMutations } from "./use-agency-shift-mutations";
import { useStatusTabs } from "./use-status-tabs";

export function useShiftBoard(userId: string, agencyName: string) {
  const { data: shifts } = useSuspenseQuery(agencyBoardQuery(userId));
  const { post, cancel } = useAgencyShiftMutations(userId);
  const { tab, setTab, tabs, visible } = useStatusTabs(shifts);
  const [postOpen, setPostOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReopenTarget | null>(null);
  const postButtonRef = useRef<HTMLButtonElement>(null);

  function openPostDialog() {
    setNotice(null);
    setPostOpen(true);
  }

  function closePostDialog() {
    setPostOpen(false);
    postButtonRef.current?.focus();
  }

  async function postShift(input: NewShiftInput) {
    await post.mutateAsync(input);
    setTab(ALL);
    setNotice("Shift posted");
  }

  function startCancel(shift: AgencyShift) {
    setNotice(null);
    setCancelTarget({ ...shift, agencyName });
  }

  async function cancelAssignment(shift: ReopenTarget, reason: CancellationReason) {
    setNotice(null);
    await cancel.mutateAsync({ shift, reason });
    const prefix = reason === "no-show" ? "No-show reported" : "Assignment cancelled";
    setNotice(
      `${prefix}: ${shift.nurseName ?? "The nurse"} was unassigned from the ${shift.role} shift on ${formatDate(shift.date)}. The shift is open again.`,
    );
  }

  return {
    shifts,
    summary: summarize(shifts),
    tab,
    setTab,
    tabs,
    visible,
    notice,
    dismissNotice: () => setNotice(null),
    postOpen,
    postButtonRef,
    openPostDialog,
    closePostDialog,
    postShift,
    cancelTarget,
    startCancel,
    closeCancelDialog: () => setCancelTarget(null),
    cancelAssignment,
  };
}

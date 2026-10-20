import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useQueryRefresh } from "@/shared/hooks/use-query-refresh";

import { ALL, inAgency, knownAgencyId } from "../lib/filters";
import { summarize } from "../lib/schedule";
import { adminBoardQuery } from "../queries/admin-board-query";
import { useStatusTabs } from "./use-status-tabs";

export function useAdminShiftOverview(userId: string) {
  const query = useSuspenseQuery(adminBoardQuery(userId));
  const { agencies, shifts } = query.data;
  const refresh = useQueryRefresh(query, "Shift overview refreshed.");
  const [agencyId, setAgencyId] = useState(ALL);
  const activeAgency = knownAgencyId(agencies, agencyId);
  const agencyShifts = inAgency(shifts, activeAgency);
  const { tab, setTab, tabs, visible } = useStatusTabs(agencyShifts);

  function clearFilters() {
    setAgencyId(ALL);
    setTab(ALL);
  }

  return {
    ...refresh,
    agencies,
    shifts,
    activeAgency,
    setAgencyId,
    summary: summarize(agencyShifts),
    tab,
    setTab,
    tabs,
    visible,
    filtering: activeAgency !== ALL || tab !== ALL,
    clearFilters,
  };
}

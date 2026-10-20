import { useState } from "react";

import type { ShiftStatus } from "@/contracts/shifts/types";
import { ALL, statusTabs, withStatus, type TabKey } from "../lib/filters";

export function useStatusTabs<T extends { status: ShiftStatus }>(shifts: readonly T[]) {
  const [tab, setTab] = useState<TabKey>(ALL);

  return { tab, setTab, tabs: statusTabs(shifts), visible: withStatus(shifts, tab) };
}

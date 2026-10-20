import { useState } from "react";

import type { MarketplaceShift } from "@/contracts/shifts/types";
import { ALL, agencyNames, filterOpenShifts } from "../lib/filters";

export function useMarketplaceFilters(shifts: readonly MarketplaceShift[]) {
  const [agency, setAgency] = useState(ALL);
  const [role, setRole] = useState(ALL);

  function clearFilters() {
    setAgency(ALL);
    setRole(ALL);
  }

  return {
    agency,
    setAgency,
    role,
    setRole,
    clearFilters,
    agencies: agencyNames(shifts),
    filtered: filterOpenShifts(shifts, { agency, role }),
    filtering: agency !== ALL || role !== ALL,
  };
}

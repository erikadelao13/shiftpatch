import { queryOptions } from "@tanstack/react-query";

import type { NurseMarketplace } from "@/contracts/shifts/types";
import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";

export const marketplaceQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.marketplace(userId),
    queryFn: () => apiFetch<NurseMarketplace>("/api/nurse/marketplace"),
  });

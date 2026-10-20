import { queryOptions } from "@tanstack/react-query";

import type { CredentialData } from "@/contracts/credentials/types";
import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";

export const credentialQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.credential(userId),
    queryFn: () => apiFetch<CredentialData>("/api/credentials"),
  });

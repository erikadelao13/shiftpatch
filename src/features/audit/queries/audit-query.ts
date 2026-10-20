import { queryOptions } from "@tanstack/react-query";

import type { AuditEntry } from "@/contracts/audit/types";
import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";

export type AuditData = { entries: AuditEntry[]; total: number };

export const auditQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.audit(userId),
    queryFn: () => apiFetch<AuditData>("/api/audit"),
    refetchOnWindowFocus: "always",
  });

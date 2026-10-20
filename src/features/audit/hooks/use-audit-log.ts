import { useSuspenseQuery } from "@tanstack/react-query";

import { useQueryRefresh } from "@/shared/hooks/use-query-refresh";

import { auditQuery } from "../queries/audit-query";

export function useAuditLog(userId: string) {
  const query = useSuspenseQuery(auditQuery(userId));
  const refresh = useQueryRefresh(query, "Audit log refreshed.");

  return { ...query.data, ...refresh };
}

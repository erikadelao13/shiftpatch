import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { AuditLog } from "@/features/audit/views/audit-log";
import { auditQuery } from "@/features/audit/queries/audit-query";
import { listAuditEntries } from "@/server/audit/audit-service";
import { requireRole } from "@/server/auth/current-user";
import { makeQueryClient } from "@/shared/client/query-client";

export default function AuditPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AuditWorkspace />
    </Suspense>
  );
}

async function AuditWorkspace() {
  const user = await requireRole("admin");

  const queryClient = makeQueryClient();
  await queryClient.fetchQuery({ ...auditQuery(user.id), queryFn: () => listAuditEntries() });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AuditLog userId={user.id} />
    </HydrationBoundary>
  );
}

import { Suspense } from "react";

import { AuditLog } from "@/features/audit/views/audit-log";
import { listAuditEntries } from "@/server/audit/audit-service";
import { requireRole } from "@/server/auth/current-user";

export default function AuditPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AuditWorkspace />
    </Suspense>
  );
}

async function AuditWorkspace() {
  await requireRole("admin");

  const { entries, total } = await listAuditEntries();

  return <AuditLog entries={entries} total={total} />;
}

import { Suspense } from "react";

import { AuditLog } from "@/features/audit/components/audit-log";
import { sampleAuditEntries } from "@/features/audit/sample-events";
import { requireRole } from "@/features/auth/server/current-user";

export default function AuditPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AuditWorkspace />
    </Suspense>
  );
}

async function AuditWorkspace() {
  await requireRole("admin");

  return <AuditLog entries={sampleAuditEntries} />;
}

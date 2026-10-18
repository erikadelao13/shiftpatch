import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";
import { AdminShiftOverview } from "@/features/shifts/components/admin-shift-overview";
import { getAdminBoard, listAgencies } from "@/features/shifts/server/shift-service";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AdminWorkspace />
    </Suspense>
  );
}

async function AdminWorkspace() {
  await requireRole("admin");
  const [agencies, shifts] = await Promise.all([listAgencies(), getAdminBoard()]);

  return <AdminShiftOverview agencies={agencies} shifts={shifts} />;
}

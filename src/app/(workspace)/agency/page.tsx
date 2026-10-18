import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";
import { ShiftBoard } from "@/features/shifts/components/shift-board";
import { getAgencyBoard, getAgencyName } from "@/features/shifts/server/shift-service";

export default function AgencyPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AgencyWorkspace />
    </Suspense>
  );
}

async function AgencyWorkspace() {
  const user = await requireRole("agency");
  if (!user.agencyId) return <p className="text-text-muted">This account has no agency.</p>;

  const [agencyName, shifts] = await Promise.all([
    getAgencyName(user.agencyId),
    getAgencyBoard(user.agencyId),
  ]);

  return <ShiftBoard agencyName={agencyName} shifts={shifts} />;
}

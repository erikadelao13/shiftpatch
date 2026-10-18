import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";
import { ShiftBoard } from "@/features/shifts/components/shift-board";
import { sampleShiftsByAgency } from "@/features/shifts/sample-shifts";
import { getPrisma } from "@/shared/server/db";

export default function AgencyPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AgencyWorkspace />
    </Suspense>
  );
}

async function AgencyWorkspace() {
  const user = await requireRole("agency");
  const agency = user.agencyId
    ? await getPrisma().agency.findUnique({
        where: { id: user.agencyId },
        select: { name: true },
      })
    : null;
  const shifts = user.agencyId ? (sampleShiftsByAgency[user.agencyId] ?? []) : [];

  return <ShiftBoard agencyName={agency?.name ?? user.name} initialShifts={shifts} />;
}

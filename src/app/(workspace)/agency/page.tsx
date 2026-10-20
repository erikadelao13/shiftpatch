import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { agencyBoardQuery } from "@/features/shifts/queries/agency-board-query";
import { ShiftBoard } from "@/features/shifts/views/shift-board";
import { makeQueryClient } from "@/shared/client/query-client";
import { getAgencyBoard, getAgencyName } from "@/server/shifts/shift-service";

export default function AgencyPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AgencyWorkspace />
    </Suspense>
  );
}

async function AgencyWorkspace() {
  const user = await requireRole("agency");
  const agencyId = user.agencyId;
  if (!agencyId) return <p className="text-text-muted">This account has no agency.</p>;

  const queryClient = makeQueryClient();
  const [agencyName] = await Promise.all([
    getAgencyName(agencyId),
    queryClient.fetchQuery({ ...agencyBoardQuery(user.id), queryFn: () => getAgencyBoard(agencyId) }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShiftBoard userId={user.id} agencyName={agencyName} />
    </HydrationBoundary>
  );
}

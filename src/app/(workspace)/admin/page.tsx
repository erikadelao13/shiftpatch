import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { adminBoardQuery } from "@/features/shifts/queries/admin-board-query";
import { AdminShiftOverview } from "@/features/shifts/views/admin-shift-overview";
import { makeQueryClient } from "@/shared/client/query-client";
import { getAdminBoard, listAgencies } from "@/server/shifts/shift-service";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AdminWorkspace />
    </Suspense>
  );
}

async function AdminWorkspace() {
  const user = await requireRole("admin");

  const queryClient = makeQueryClient();
  await queryClient.fetchQuery({
    ...adminBoardQuery(user.id),
    queryFn: async () => {
      const [agencies, shifts] = await Promise.all([listAgencies(), getAdminBoard()]);
      return { agencies, shifts };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminShiftOverview userId={user.id} />
    </HydrationBoundary>
  );
}

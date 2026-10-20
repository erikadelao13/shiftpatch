import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { credentialQuery } from "@/features/credentials/queries/credential-query";
import { CredentialStatus } from "@/features/credentials/views/credential-status";
import { marketplaceQuery } from "@/features/shifts/queries/marketplace-query";
import { Marketplace } from "@/features/shifts/views/marketplace";
import { makeQueryClient } from "@/shared/client/query-client";
import { getCredentialData } from "@/server/credentials/credential-service";
import { getNurseMarketplace } from "@/server/shifts/shift-service";

export default function NursePage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <NurseWorkspace />
    </Suspense>
  );
}

async function NurseWorkspace() {
  const user = await requireRole("nurse");

  const queryClient = makeQueryClient();
  await Promise.all([
    queryClient.fetchQuery({ ...marketplaceQuery(user.id), queryFn: () => getNurseMarketplace(user.id) }),
    queryClient.fetchQuery({ ...credentialQuery(user.id), queryFn: () => getCredentialData(user.id) }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Marketplace userId={user.id} banner={<CredentialStatus userId={user.id} />} />
    </HydrationBoundary>
  );
}

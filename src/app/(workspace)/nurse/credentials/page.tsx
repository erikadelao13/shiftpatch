import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { credentialQuery } from "@/features/credentials/queries/credential-query";
import { CredentialWorkspace } from "@/features/credentials/views/credential-workspace";
import { makeQueryClient } from "@/shared/client/query-client";
import { getCredentialData } from "@/server/credentials/credential-service";
import { todayIsoDate } from "@/contracts/credentials/status";

export default function CredentialsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
          Workspace <span aria-hidden="true">/</span>{" "}
          <span aria-current="page">Credentials</span>
        </nav>
        <div>
          <h1 className="font-display text-[2.25rem] leading-[1.12] text-brand-800 md:text-5xl">
            Keep your credentials current.
          </h1>
          <p className="mt-2 text-lg text-text-muted">
            Upload your document and expiry date to keep picking up shifts.
          </p>
        </div>
      </header>

      <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
        <CredentialData />
      </Suspense>
    </div>
  );
}

async function CredentialData() {
  const user = await requireRole("nurse");

  const queryClient = makeQueryClient();
  await queryClient.fetchQuery({
    ...credentialQuery(user.id),
    queryFn: () => getCredentialData(user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CredentialWorkspace userId={user.id} today={todayIsoDate()} />
    </HydrationBoundary>
  );
}

import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";
import { getCredentialExpiry } from "@/features/credentials/server/credential-service";
import { getCredentialStatus, todayIsoDate } from "@/features/credentials/status";
import { Marketplace } from "@/features/shifts/components/marketplace";
import { getNurseMarketplace } from "@/features/shifts/server/shift-service";

export default function NursePage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <NurseWorkspace />
    </Suspense>
  );
}

async function NurseWorkspace() {
  const user = await requireRole("nurse");
  const [{ openShifts, myShifts }, expiresOn] = await Promise.all([
    getNurseMarketplace(user.id),
    getCredentialExpiry(user.id),
  ]);

  return (
    <Marketplace
      openShifts={openShifts}
      myShifts={myShifts}
      credential={getCredentialStatus(expiresOn, todayIsoDate())}
    />
  );
}

import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { getCredentialExpiry } from "@/server/credentials/credential-service";
import { getCredentialStatus, todayIsoDate } from "@/contracts/credentials/status";
import { Marketplace } from "@/features/shifts/components/marketplace";
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

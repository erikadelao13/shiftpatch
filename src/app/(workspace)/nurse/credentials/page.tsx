import { Suspense } from "react";

import { requireRole } from "@/server/auth/current-user";
import { CredentialBanner } from "@/features/credentials/components/credential-banner";
import { CredentialUploadForm } from "@/features/credentials/components/credential-upload-form";
import { CurrentCredential } from "@/features/credentials/components/current-credential";
import { getCredentialRecord } from "@/server/credentials/credential-service";
import { getCredentialStatus, todayIsoDate } from "@/contracts/credentials/status";

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
        <CredentialWorkspace />
      </Suspense>
    </div>
  );
}

async function CredentialWorkspace() {
  const user = await requireRole("nurse");
  const record = await getCredentialRecord(user.id);
  const today = todayIsoDate();
  const status = getCredentialStatus(record.expiresOn, today);

  return (
    <>
      <CredentialBanner status={status} />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <CredentialUploadForm today={today} />
        <CurrentCredential status={status} document={record.document} />
      </div>
    </>
  );
}

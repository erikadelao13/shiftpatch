"use client";

import { CredentialBanner } from "../components/credential-banner";
import { CurrentCredential } from "../components/current-credential";
import { useCredential } from "../hooks/use-credential";
import { CredentialUploadForm } from "./credential-upload-form";

export function CredentialWorkspace({ userId, today }: { userId: string; today: string }) {
  const { status, document } = useCredential(userId);

  return (
    <>
      <CredentialBanner status={status} />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <CredentialUploadForm userId={userId} today={today} />
        <CurrentCredential status={status} document={document} />
      </div>
    </>
  );
}

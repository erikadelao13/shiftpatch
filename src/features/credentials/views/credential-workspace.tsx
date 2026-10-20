"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { CredentialBanner } from "../components/credential-banner";
import { CurrentCredential } from "../components/current-credential";
import { credentialQuery } from "../queries/credential-query";
import { CredentialUploadForm } from "./credential-upload-form";

export function CredentialWorkspace({ userId, today }: { userId: string; today: string }) {
  const {
    data: { status, document },
  } = useSuspenseQuery(credentialQuery(userId));

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

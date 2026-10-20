"use client";

import { CredentialBanner } from "../components/credential-banner";
import { useCredential } from "../hooks/use-credential";

export function CredentialStatus({ userId }: { userId: string }) {
  const { status } = useCredential(userId);

  return <CredentialBanner status={status} />;
}

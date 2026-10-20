"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { CredentialBanner } from "../components/credential-banner";
import { credentialQuery } from "../queries/credential-query";

export function CredentialStatus({ userId }: { userId: string }) {
  const { data } = useSuspenseQuery(credentialQuery(userId));

  return <CredentialBanner status={data.status} />;
}

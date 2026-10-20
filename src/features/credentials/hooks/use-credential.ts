import { useSuspenseQuery } from "@tanstack/react-query";

import { credentialQuery } from "../queries/credential-query";

export function useCredential(userId: string) {
  return useSuspenseQuery(credentialQuery(userId)).data;
}

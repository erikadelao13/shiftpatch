export type CredentialStatus =
  | { state: "valid"; expiresOn: string }
  | { state: "expired"; expiresOn: string }
  | { state: "missing" };

export function getCredentialStatus(expiresOn: string | null, today: string): CredentialStatus {
  if (!expiresOn) return { state: "missing" };
  return { state: expiresOn >= today ? "valid" : "expired", expiresOn };
}

export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

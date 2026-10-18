import "server-only";

// The Credential table arrives with the credentials plan; until then the
// spec's seeded expiries are the only credential data that exists.
const SEEDED_EXPIRIES: Readonly<Record<string, string>> = {
  "nurse-1": "2027-01-01",
  "nurse-2": "2026-06-01",
};

export async function getCredentialExpiry(nurseId: string): Promise<string | null> {
  return SEEDED_EXPIRIES[nurseId] ?? null;
}

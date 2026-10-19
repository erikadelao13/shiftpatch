export type Role = "nurse" | "agency" | "admin";

export const ROLES: readonly Role[] = ["nurse", "agency", "admin"];

// Loaded from the database on every request. Authorization reads this, never
// the token's `role` claim.
export type Actor = {
  id: string;
  name: string;
  role: Role;
  agencyId: string | null;
};

export type PublicUser = {
  id: string;
  name: string;
  role: Role;
};

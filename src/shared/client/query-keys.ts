export const queryKeys = {
  agencyBoard: (userId: string) => [userId, "agency-board"] as const,
  marketplace: (userId: string) => [userId, "marketplace"] as const,
  adminBoard: (userId: string) => [userId, "admin-board"] as const,
  audit: (userId: string) => [userId, "audit"] as const,
  timesheets: (userId: string) => [userId, "timesheets"] as const,
  credential: (userId: string) => [userId, "credential"] as const,
};

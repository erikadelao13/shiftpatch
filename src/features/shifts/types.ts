export const SHIFT_ROLES = ["RN", "LPN"] as const;

export type ShiftRole = (typeof SHIFT_ROLES)[number];

export type ShiftStatus = "open" | "filled";

export type ShiftDTO = {
  id: string;
  agencyId: string;
  agencyName: string;
  role: ShiftRole;
  date: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  claimedBy: string | null;
};

export type AgencyShift = Pick<
  ShiftDTO,
  "id" | "role" | "date" | "startTime" | "endTime" | "status"
> & {
  nurseName: string | null;
};

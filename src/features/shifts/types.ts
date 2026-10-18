export const SHIFT_ROLES = ["RN", "LPN"] as const;

export type ShiftRole = (typeof SHIFT_ROLES)[number];

export type ShiftStatus = "open" | "filled" | "cancelled";

export type AgencyShift = {
  id: string;
  role: ShiftRole;
  date: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  nurseName: string | null;
};

export type NewShiftInput = Pick<AgencyShift, "role" | "date" | "startTime" | "endTime">;

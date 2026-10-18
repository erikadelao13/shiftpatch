import type { ShiftRole } from "@/features/shifts/types";

export type TimesheetEntryState = "assigned" | "cancelled" | "no-show";

export type TimesheetEntry = {
  id: string;
  shiftId: string;
  role: ShiftRole;
  agencyName: string;
  date: string;
  startTime: string;
  endTime: string;
  nurseName: string;
  state: TimesheetEntryState;
};

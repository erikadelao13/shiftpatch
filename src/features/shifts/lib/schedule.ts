import type { AgencyShift } from "@/contracts/shifts/types";
import { durationHours, endsNextDay } from "@/shared/lib/shift-time";

export type ShiftSummary = {
  open: number;
  filled: number;
  coveragePercent: number | null;
  scheduledHours: number;
};

export function summarize(shifts: readonly AgencyShift[]): ShiftSummary {
  const open = shifts.filter((shift) => shift.status === "open").length;
  const filledShifts = shifts.filter((shift) => shift.status === "filled");
  const staffed = open + filledShifts.length;

  return {
    open,
    filled: filledShifts.length,
    coveragePercent: staffed === 0 ? null : Math.round((filledShifts.length / staffed) * 100),
    scheduledHours: filledShifts.reduce((total, shift) => total + durationHours(shift), 0),
  };
}

export function formatTimeRange(shift: Pick<AgencyShift, "startTime" | "endTime">): string {
  const range = `${shift.startTime}–${shift.endTime}`;
  return endsNextDay(shift) ? `${range} (+1 day)` : range;
}

export function compareShifts(a: AgencyShift, b: AgencyShift): number {
  return `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);
}


import type { AgencyShift } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const MINUTES_PER_DAY = 24 * 60;

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function endsNextDay(shift: Pick<AgencyShift, "startTime" | "endTime">): boolean {
  return toMinutes(shift.endTime) <= toMinutes(shift.startTime);
}

export function durationHours(shift: Pick<AgencyShift, "startTime" | "endTime">): number {
  const minutes = toMinutes(shift.endTime) - toMinutes(shift.startTime);
  return (minutes > 0 ? minutes : minutes + MINUTES_PER_DAY) / 60;
}

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

export function formatDate(isoDate: string): string {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTimeRange(shift: Pick<AgencyShift, "startTime" | "endTime">): string {
  const range = `${shift.startTime}–${shift.endTime}`;
  return endsNextDay(shift) ? `${range} (+1 day)` : range;
}

export function compareShifts(a: AgencyShift, b: AgencyShift): number {
  return `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);
}

export function formatEndsOn(shift: Pick<AgencyShift, "date" | "startTime" | "endTime">): string | null {
  if (!endsNextDay(shift)) return null;
  const [year = 0, month = 1, day = 1] = shift.date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + DAY_MS).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

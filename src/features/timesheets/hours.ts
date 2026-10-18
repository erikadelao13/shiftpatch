import { durationHours } from "@/features/shifts/schedule";

import type { TimesheetEntry } from "./types";

type ScheduledShift = Pick<TimesheetEntry, "startTime" | "endTime">;

export type TimesheetTotals = { assigned: number; history: number; scheduledHours: number };

export function formatHours(hours: number): string {
  return `${Math.round(hours * 100) / 100}h`;
}

export function totalScheduledHours(shifts: readonly ScheduledShift[]): number {
  return shifts.reduce((total, shift) => total + durationHours(shift), 0);
}

export function timesheetTotals(entries: readonly TimesheetEntry[]): TimesheetTotals {
  const assigned = entries.filter((entry) => entry.state === "assigned");
  return {
    assigned: assigned.length,
    history: entries.length - assigned.length,
    scheduledHours: totalScheduledHours(assigned),
  };
}

import type { AgencyShift } from "@/contracts/shifts/types";

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

export function formatEndsOn(shift: Pick<AgencyShift, "date" | "startTime" | "endTime">): string | null {
  if (!endsNextDay(shift)) return null;
  const [year = 0, month = 1, day = 1] = shift.date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + DAY_MS).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

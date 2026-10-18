import { durationHours } from "@/features/shifts/schedule";
import type { MarketplaceShift } from "@/features/shifts/types";

type ScheduledShift = Pick<MarketplaceShift, "startTime" | "endTime">;

export function formatHours(hours: number): string {
  return `${Math.round(hours * 100) / 100}h`;
}

export function totalScheduledHours(shifts: readonly ScheduledShift[]): number {
  return shifts.reduce((total, shift) => total + durationHours(shift), 0);
}

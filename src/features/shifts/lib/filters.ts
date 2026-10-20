import type { AgencyOption, MarketplaceShift, ShiftStatus } from "@/contracts/shifts/types";

export const ALL = "all";

export type TabKey = typeof ALL | ShiftStatus;

export type StatusTab = { key: TabKey; label: string; count: number };

export type MarketplaceFilters = { agency: string; role: string };

function countStatus(shifts: readonly { status: ShiftStatus }[], status: ShiftStatus): number {
  return shifts.filter((shift) => shift.status === status).length;
}

export function statusTabs(shifts: readonly { status: ShiftStatus }[]): StatusTab[] {
  return [
    { key: ALL, label: "All shifts", count: shifts.length },
    { key: "open", label: "Open", count: countStatus(shifts, "open") },
    { key: "filled", label: "Filled", count: countStatus(shifts, "filled") },
  ];
}

export function withStatus<T extends { status: ShiftStatus }>(shifts: readonly T[], tab: TabKey): T[] {
  return shifts.filter((shift) => tab === ALL || shift.status === tab);
}

export function inAgency<T extends { agencyId: string }>(shifts: readonly T[], agencyId: string): T[] {
  return shifts.filter((shift) => agencyId === ALL || shift.agencyId === agencyId);
}

export function knownAgencyId(agencies: readonly AgencyOption[], agencyId: string): string {
  return agencies.some((agency) => agency.id === agencyId) ? agencyId : ALL;
}

export function agencyNames(shifts: readonly Pick<MarketplaceShift, "agencyName">[]): string[] {
  return [...new Set(shifts.map((shift) => shift.agencyName))].sort();
}

export function filterOpenShifts<T extends Pick<MarketplaceShift, "agencyName" | "role">>(
  shifts: readonly T[],
  { agency, role }: MarketplaceFilters,
): T[] {
  return shifts.filter(
    (shift) => (agency === ALL || shift.agencyName === agency) && (role === ALL || shift.role === role),
  );
}

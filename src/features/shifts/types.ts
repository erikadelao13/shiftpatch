export const SHIFT_ROLES = ["RN", "LPN"] as const;

export type ShiftRole = (typeof SHIFT_ROLES)[number];

export type ShiftStatus = "open" | "filled";

export const CANCELLATION_REASONS = ["advance", "no-show"] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

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

export type CancelledShiftDTO = ShiftDTO & {
  cancellation: { reason: CancellationReason; previousNurseId: string };
};

export type AgencyShift = Pick<
  ShiftDTO,
  "id" | "role" | "date" | "startTime" | "endTime" | "status"
> & {
  nurseName: string | null;
};

export type AdminShift = AgencyShift & Pick<ShiftDTO, "agencyId" | "agencyName">;

export type AgencyOption = { id: string; name: string };

export type MarketplaceShift = Pick<
  ShiftDTO,
  "id" | "role" | "date" | "startTime" | "endTime" | "agencyName"
>;

export type NurseMarketplace = {
  openShifts: MarketplaceShift[];
  myShifts: MarketplaceShift[];
};

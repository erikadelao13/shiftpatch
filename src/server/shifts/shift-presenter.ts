import "server-only";

import type { CancellationReason as DbCancellationReason } from "@/generated/prisma/client";

import type { CancellationReason, CancelledShiftDTO, ShiftDTO, ShiftRole, ShiftStatus } from "@/contracts/shifts/types";

export type ShiftRow = {
  id: string;
  agencyId: string;
  agency: { name: string };
  role: ShiftRole;
  date: Date;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  claimedById: string | null;
};

export function toShiftDTO(row: ShiftRow): ShiftDTO {
  return {
    id: row.id,
    agencyId: row.agencyId,
    agencyName: row.agency.name,
    role: row.role,
    date: row.date.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    claimedBy: row.claimedById,
  };
}

const reasonToApi: Record<DbCancellationReason, CancellationReason> = {
  advance: "advance",
  no_show: "no-show",
};

export function toDbCancellationReason(reason: CancellationReason): DbCancellationReason {
  return reason === "no-show" ? "no_show" : "advance";
}

export function toCancelledShiftDTO(
  row: ShiftRow,
  cancellation: { reason: DbCancellationReason; previousNurseId: string },
): CancelledShiftDTO {
  return {
    ...toShiftDTO(row),
    cancellation: {
      reason: reasonToApi[cancellation.reason],
      previousNurseId: cancellation.previousNurseId,
    },
  };
}

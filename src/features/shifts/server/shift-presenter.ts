import "server-only";

import type { ShiftDTO, ShiftRole, ShiftStatus } from "../types";

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

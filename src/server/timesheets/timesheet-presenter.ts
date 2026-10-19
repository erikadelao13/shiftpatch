import "server-only";

import type { CancellationReason as DbCancellationReason } from "@/generated/prisma/client";
import type { ShiftRole } from "@/contracts/shifts/types";

import type { TimesheetEntry, TimesheetEntryState } from "@/contracts/timesheets/types";

type ShiftFields = {
  id: string;
  role: ShiftRole;
  date: Date;
  startTime: string;
  endTime: string;
  createdAt: Date;
  agency: { name: string };
};

export type AssignmentRow = ShiftFields & { claimedBy: { name: string } | null };

export type CancellationRow = {
  id: string;
  reason: DbCancellationReason;
  createdAt: Date;
  previousNurse: { name: string };
  shift: ShiftFields;
};

const CANCELLATION_STATES: Record<DbCancellationReason, TimesheetEntryState> = {
  advance: "cancelled",
  no_show: "no-show",
};

type SortableEntry = { entry: TimesheetEntry; shiftCreatedAt: number; eventAt: number };

function compareSortable(a: SortableEntry, b: SortableEntry): number {
  const left = a.entry;
  const right = b.entry;
  return (
    left.date.localeCompare(right.date) ||
    left.startTime.localeCompare(right.startTime) ||
    a.shiftCreatedAt - b.shiftCreatedAt ||
    left.shiftId.localeCompare(right.shiftId) ||
    a.eventAt - b.eventAt
  );
}

function fromAssignment(row: AssignmentRow): SortableEntry {
  if (!row.claimedBy) throw new Error(`Filled shift ${row.id} has no nurse.`);
  return {
    entry: {
      id: row.id,
      shiftId: row.id,
      role: row.role,
      agencyName: row.agency.name,
      date: row.date.toISOString().slice(0, 10),
      startTime: row.startTime,
      endTime: row.endTime,
      nurseName: row.claimedBy.name,
      state: "assigned",
    },
    shiftCreatedAt: row.createdAt.getTime(),
    eventAt: Number.POSITIVE_INFINITY,
  };
}

function fromCancellation(row: CancellationRow): SortableEntry {
  const { shift } = row;
  return {
    entry: {
      id: row.id,
      shiftId: shift.id,
      role: shift.role,
      agencyName: shift.agency.name,
      date: shift.date.toISOString().slice(0, 10),
      startTime: shift.startTime,
      endTime: shift.endTime,
      nurseName: row.previousNurse.name,
      state: CANCELLATION_STATES[row.reason],
    },
    shiftCreatedAt: shift.createdAt.getTime(),
    eventAt: row.createdAt.getTime(),
  };
}

export function toTimesheetEntries(
  assignments: readonly AssignmentRow[],
  cancellations: readonly CancellationRow[],
): TimesheetEntry[] {
  return [...assignments.map(fromAssignment), ...cancellations.map(fromCancellation)]
    .sort(compareSortable)
    .map(({ entry }) => entry);
}

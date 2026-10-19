import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db";

import type { TimesheetEntry } from "@/contracts/timesheets/types";
import {
  toTimesheetEntries,
  type AssignmentRow,
  type CancellationRow,
} from "./timesheet-presenter";

export type TimesheetScope =
  | { kind: "nurse"; nurseId: string }
  | { kind: "agency"; agencyId: string }
  | { kind: "all" };

const shiftSelect = {
  id: true,
  role: true,
  date: true,
  startTime: true,
  endTime: true,
  createdAt: true,
  agency: { select: { name: true } },
} satisfies Prisma.ShiftSelect;

function assignmentWhere(scope: TimesheetScope): Prisma.ShiftWhereInput {
  switch (scope.kind) {
    case "nurse":
      return { status: "filled", claimedById: scope.nurseId };
    case "agency":
      return { status: "filled", agencyId: scope.agencyId };
    case "all":
      return { status: "filled" };
  }
}

function cancellationWhere(scope: TimesheetScope): Prisma.CancellationWhereInput {
  switch (scope.kind) {
    case "nurse":
      return { previousNurseId: scope.nurseId };
    case "agency":
      return { shift: { agencyId: scope.agencyId } };
    case "all":
      return {};
  }
}

export async function listTimesheetEntries(scope: TimesheetScope): Promise<TimesheetEntry[]> {
  const prisma = getPrisma();
  const [assignments, cancellations] = await Promise.all([
    prisma.shift.findMany({
      where: assignmentWhere(scope),
      select: { ...shiftSelect, claimedBy: { select: { name: true } } },
    }),
    prisma.cancellation.findMany({
      where: cancellationWhere(scope),
      select: {
        id: true,
        reason: true,
        createdAt: true,
        previousNurse: { select: { name: true } },
        shift: { select: shiftSelect },
      },
    }),
  ]);
  const assignmentRows: AssignmentRow[] = assignments;
  const cancellationRows: CancellationRow[] = cancellations;

  return toTimesheetEntries(assignmentRows, cancellationRows);
}

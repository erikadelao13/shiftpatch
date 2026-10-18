import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";

import type { Actor } from "@/features/auth/types";
import { HttpError } from "@/shared/server/errors";
import { getPrisma } from "@/shared/server/db";

import type { NewShiftInput } from "../schemas";
import type { AgencyShift, ShiftDTO } from "../types";
import { canPostShift, canReadAgencyShifts } from "./shift-policy";
import { toShiftDTO } from "./shift-presenter";

const inScheduleOrder = [
  { date: "asc" },
  { startTime: "asc" },
  { createdAt: "asc" },
] as const;

export async function listShifts(): Promise<ShiftDTO[]> {
  const rows = await getPrisma().shift.findMany({
    include: { agency: { select: { name: true } } },
    orderBy: [...inScheduleOrder],
  });
  return rows.map(toShiftDTO);
}

export async function listAgencyShifts(
  actor: Actor,
  agencyId: string,
): Promise<ShiftDTO[]> {
  if (!canReadAgencyShifts(actor, agencyId)) {
    throw new HttpError(403, "You can only view your own agency's shifts");
  }
  const prisma = getPrisma();
  if (actor.role === "admin") {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new HttpError(404, "Agency not found");
  }
  const rows = await prisma.shift.findMany({
    where: { agencyId },
    include: { agency: { select: { name: true } } },
    orderBy: [...inScheduleOrder],
  });
  return rows.map(toShiftDTO);
}

export async function createShift(
  actor: Actor,
  input: NewShiftInput,
): Promise<ShiftDTO> {
  if (!canPostShift(actor) || actor.agencyId === null) {
    throw new HttpError(403, "Only agency accounts can post shifts");
  }
  const row = await getPrisma().shift.create({
    data: {
      id: `shift-${randomUUID()}`,
      agencyId: actor.agencyId,
      role: input.role,
      date: new Date(input.date),
      startTime: input.startTime,
      endTime: input.endTime,
    },
    include: { agency: { select: { name: true } } },
  });
  return toShiftDTO(row);
}

export async function getAgencyBoard(agencyId: string): Promise<AgencyShift[]> {
  const rows = await getPrisma().shift.findMany({
    where: { agencyId },
    include: { claimedBy: { select: { name: true } } },
    orderBy: [...inScheduleOrder],
  });
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    date: row.date.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    nurseName: row.claimedBy?.name ?? null,
  }));
}

export const getAgencyName = cache(async (agencyId: string): Promise<string> => {
  const agency = await getPrisma().agency.findUnique({
    where: { id: agencyId },
    select: { name: true },
  });
  if (!agency) throw new HttpError(404, "Agency not found");
  return agency.name;
});

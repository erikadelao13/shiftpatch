import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";

import { recordAuditEvent } from "@/features/audit/server/audit-service";
import type { Actor } from "@/features/auth/types";
import { getCredentialStatus, todayIsoDate } from "@/features/credentials/status";
import { getCredentialExpiry } from "@/features/credentials/server/credential-service";
import { HttpError } from "@/shared/server/errors";
import { getPrisma } from "@/shared/server/db";

import type { NewShiftInput } from "../schemas";
import type {
  AgencyShift,
  CancellationReason,
  CancelledShiftDTO,
  MarketplaceShift,
  NurseMarketplace,
  ShiftDTO,
} from "../types";
import {
  canClaimShift,
  canPostShift,
  canReadAgencyShifts,
  canRecordNoShow,
  cancellationRefusal,
  credentialClaimError,
} from "./shift-policy";
import { toCancelledShiftDTO, toDbCancellationReason, toShiftDTO } from "./shift-presenter";

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

export async function claimShift(
  actor: Actor,
  shiftId: string,
  today: string = todayIsoDate(),
): Promise<ShiftDTO> {
  if (!canClaimShift(actor)) {
    throw new HttpError(403, "Only nurses can claim shifts");
  }
  return getPrisma().$transaction(async (tx) => {
    const status = getCredentialStatus(await getCredentialExpiry(actor.id, tx), today);
    const credentialError = credentialClaimError(status);
    if (credentialError) throw new HttpError(403, credentialError);

    const { count } = await tx.shift.updateMany({
      where: { id: shiftId, status: "open", claimedById: null },
      data: { status: "filled", claimedById: actor.id },
    });
    if (count === 0) {
      const existing = await tx.shift.findUnique({
        where: { id: shiftId },
        select: { id: true },
      });
      throw existing
        ? new HttpError(409, "Shift is no longer available")
        : new HttpError(404, "Shift not found");
    }

    const row = await tx.shift.findUniqueOrThrow({
      where: { id: shiftId },
      include: { agency: { select: { name: true } } },
    });
    await recordAuditEvent(tx, {
      actorId: actor.id,
      action: "shift_claimed",
      resourceType: "shift",
      resourceId: shiftId,
      metadata: { agencyId: row.agencyId },
    });
    return toShiftDTO(row);
  });
}

export async function cancelShift(
  actor: Actor,
  shiftId: string,
  reason: CancellationReason,
): Promise<CancelledShiftDTO> {
  if (reason === "no-show" && !canRecordNoShow(actor)) {
    throw new HttpError(403, "Only agencies and admins can record a no-show");
  }
  const dbReason = toDbCancellationReason(reason);
  return getPrisma().$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
      select: { agencyId: true, status: true, claimedById: true },
    });
    if (!shift) throw new HttpError(404, "Shift not found");
    const refusal = cancellationRefusal(actor, shift);
    if (refusal) throw new HttpError(refusal.status, refusal.message);
    const previousNurseId = shift.claimedById;
    if (previousNurseId === null) throw new HttpError(409, "Shift has no active assignment");

    const { count } = await tx.shift.updateMany({
      where: { id: shiftId, status: "filled", claimedById: previousNurseId },
      data: { status: "open", claimedById: null },
    });
    if (count === 0) throw new HttpError(409, "Shift has no active assignment");

    await tx.cancellation.create({
      data: { shiftId, reason: dbReason, previousNurseId, actorId: actor.id },
    });
    const row = await tx.shift.findUniqueOrThrow({
      where: { id: shiftId },
      include: { agency: { select: { name: true } } },
    });
    await recordAuditEvent(tx, {
      actorId: actor.id,
      action: "shift_cancelled",
      resourceType: "shift",
      resourceId: shiftId,
      metadata: { agencyId: row.agencyId, reason, previousNurseId },
    });
    return toCancelledShiftDTO(row, { reason: dbReason, previousNurseId });
  });
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

export async function getNurseMarketplace(nurseId: string): Promise<NurseMarketplace> {
  const rows = await getPrisma().shift.findMany({
    where: { OR: [{ status: "open" }, { claimedById: nurseId }] },
    include: { agency: { select: { name: true } } },
    orderBy: [...inScheduleOrder],
  });
  const toMarketplaceShift = (row: (typeof rows)[number]): MarketplaceShift => ({
    id: row.id,
    role: row.role,
    date: row.date.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    agencyName: row.agency.name,
  });
  return {
    openShifts: rows.filter((row) => row.status === "open").map(toMarketplaceShift),
    myShifts: rows.filter((row) => row.claimedById === nurseId).map(toMarketplaceShift),
  };
}

export const getAgencyName = cache(async (agencyId: string): Promise<string> => {
  const agency = await getPrisma().agency.findUnique({
    where: { id: agencyId },
    select: { name: true },
  });
  if (!agency) throw new HttpError(404, "Agency not found");
  return agency.name;
});

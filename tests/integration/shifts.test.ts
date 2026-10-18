import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fixtureShifts } from "../../prisma/fixtures";
import type { Actor } from "@/features/auth/types";
import {
  createShift,
  getAgencyBoard,
  listAgencyShifts,
  listShifts,
} from "@/features/shifts/server/shift-service";
import { getDb, getPrisma } from "@/shared/server/db";

import { expectHttpError } from "./support";

// Runs on the Neon dev branch and needs `pnpm db:seed`. Creates a throwaway
// agency and deletes only its own rows; the fixture agencies stay clean.
const prisma = getPrisma();
const runId = randomUUID().slice(0, 8);
const agencyId = `test-${runId}-agency`;

const throwawayAgency: Actor = {
  id: `test-${runId}-user`,
  name: "Throwaway Agency",
  role: "agency",
  agencyId,
};
const agencyA: Actor = { id: "agency-a", name: "A", role: "agency", agencyId: "agency-a" };
const agencyB: Actor = { id: "agency-b", name: "B", role: "agency", agencyId: "agency-b" };
const nurse: Actor = { id: "nurse-1", name: "Maria Lopez", role: "nurse", agencyId: null };
const admin: Actor = { id: "admin-1", name: "Alex Kim", role: "admin", agencyId: null };

const specShifts = {
  "shift-1": {
    id: "shift-1",
    agencyId: "agency-a",
    agencyName: "Sunrise Health Staffing",
    role: "RN",
    date: "2026-10-02",
    startTime: "19:00",
    endTime: "07:00",
    status: "open",
    claimedBy: null,
  },
  "shift-2": {
    id: "shift-2",
    agencyId: "agency-a",
    agencyName: "Sunrise Health Staffing",
    role: "LPN",
    date: "2026-10-03",
    startTime: "07:00",
    endTime: "19:00",
    status: "filled",
    claimedBy: "nurse-1",
  },
  "shift-3": {
    id: "shift-3",
    agencyId: "agency-b",
    agencyName: "Metro Care Partners",
    role: "RN",
    date: "2026-10-04",
    startTime: "19:00",
    endTime: "07:00",
    status: "open",
    claimedBy: null,
  },
} as const;

beforeAll(async () => {
  const seeded = await prisma.shift.findMany({
    where: { id: { in: fixtureShifts.map((shift) => shift.id) } },
    include: { agency: { select: { name: true } } },
  });
  const matchesSpec =
    seeded.length === fixtureShifts.length &&
    seeded.every((row) => {
      const spec = specShifts[row.id as keyof typeof specShifts];
      return (
        row.agencyId === spec.agencyId &&
        row.role === spec.role &&
        row.date.toISOString().slice(0, 10) === spec.date &&
        row.startTime === spec.startTime &&
        row.endTime === spec.endTime &&
        row.status === spec.status &&
        row.claimedById === spec.claimedBy
      );
    });
  if (!matchesSpec) {
    throw new Error("The seeded shifts are missing or changed. Run `pnpm db:seed` first.");
  }

  await prisma.agency.create({ data: { id: agencyId, name: "Throwaway Agency" } });
});

afterAll(async () => {
  await prisma.shift.deleteMany({ where: { agencyId } });
  await prisma.agency.deleteMany({ where: { id: agencyId } });
  await getDb().end();
});

describe("listShifts", () => {
  it("contains each seeded shift exactly, across both agencies", async () => {
    const shifts = await listShifts();

    for (const spec of Object.values(specShifts)) {
      expect(shifts).toContainEqual(spec);
    }
    const agencies = new Set(shifts.map((shift) => shift.agencyId));
    expect(agencies.has("agency-a") && agencies.has("agency-b")).toBe(true);
    expect(shifts.some((shift) => shift.status === "filled")).toBe(true);
  });
});

describe("listAgencyShifts", () => {
  it("gives an agency only its own shifts", async () => {
    const a = await listAgencyShifts(agencyA, "agency-a");
    expect(a).toContainEqual(specShifts["shift-1"]);
    expect(a).toContainEqual(specShifts["shift-2"]);
    expect(a.every((shift) => shift.agencyId === "agency-a")).toBe(true);

    const b = await listAgencyShifts(agencyB, "agency-b");
    expect(b).toContainEqual(specShifts["shift-3"]);
    expect(b.every((shift) => shift.agencyId === "agency-b")).toBe(true);
  });

  it("refuses another agency, even an unknown one, with 403", async () => {
    await expectHttpError(listAgencyShifts(agencyA, "agency-b"), 403);
    await expectHttpError(listAgencyShifts(agencyA, "agency-nope"), 403);
  });

  it("refuses a nurse with 403", async () => {
    await expectHttpError(listAgencyShifts(nurse, "agency-a"), 403);
  });

  it("lets the admin read any agency and gets 404 for an unknown one", async () => {
    const shifts = await listAgencyShifts(admin, "agency-b");
    expect(shifts).toContainEqual(specShifts["shift-3"]);
    await expectHttpError(listAgencyShifts(admin, "agency-nope"), 404, "Agency not found");
  });
});

describe("createShift", () => {
  const input = { role: "LPN", date: "2026-11-05", startTime: "19:00", endTime: "07:00" } as const;

  it("creates an open, unassigned shift under the caller's agency", async () => {
    const shift = await createShift(throwawayAgency, input);

    expect(shift).toEqual({
      id: shift.id,
      agencyId,
      agencyName: "Throwaway Agency",
      ...input,
      status: "open",
      claimedBy: null,
    });
    expect(shift.id).toMatch(/^shift-/);

    const listed = await listAgencyShifts(throwawayAgency, agencyId);
    expect(listed).toContainEqual(shift);
  });

  it("accepts a past date", async () => {
    const shift = await createShift(throwawayAgency, { ...input, date: "2020-01-01" });
    expect(shift.date).toBe("2020-01-01");
  });

  it("refuses a nurse and the admin with 403", async () => {
    await expectHttpError(
      createShift(nurse, input),
      403,
      "Only agency accounts can post shifts",
    );
    await expectHttpError(createShift(admin, input), 403);
  });

  it("shows the new shift on the agency board with no nurse", async () => {
    const shift = await createShift(throwawayAgency, { ...input, date: "2026-11-06" });
    const board = await getAgencyBoard(agencyId);
    expect(board).toContainEqual({
      id: shift.id,
      role: "LPN",
      date: "2026-11-06",
      startTime: "19:00",
      endTime: "07:00",
      status: "open",
      nurseName: null,
    });
  });
});

describe("getAgencyBoard", () => {
  it("joins the nurse's name onto a filled shift", async () => {
    const board = await getAgencyBoard("agency-a");
    expect(board).toContainEqual({
      id: "shift-2",
      role: "LPN",
      date: "2026-10-03",
      startTime: "07:00",
      endTime: "19:00",
      status: "filled",
      nurseName: "Maria Lopez",
    });
    expect(board.find((shift) => shift.id === "shift-1")?.nurseName).toBeNull();
  });
});

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Actor } from "@/contracts/auth/types";
import {
  getCredentialDocument,
  getCredentialRecord,
  saveCredential,
} from "@/server/credentials/credential-service";
import { claimShift, createShift } from "@/server/shifts/shift-service";
import { getDb, getPrisma } from "@/server/db";

import { assertSeededState, expectHttpError } from "./support";

// Runs on the Neon dev branch and needs `pnpm db:seed`. Every save here is
// for a throwaway nurse; the seeded credentials are only read.
const prisma = getPrisma();
const runId = randomUUID().slice(0, 8);
const agencyId = `test-${runId}-agency`;

const throwawayAgency: Actor = {
  id: `test-${runId}-agency-user`,
  name: "Throwaway Agency",
  role: "agency",
  agencyId,
};
const nurseOf = (key: string): Actor => ({
  id: `test-${runId}-${key}`,
  name: `Throwaway ${key}`,
  role: "nurse",
  agencyId: null,
});
const saver = nurseOf("saver");
const claimer = nurseOf("claimer");
const refused = nurseOf("refused");
const lonely = nurseOf("lonely");
const racerFor = (round: number) => nurseOf(`racer-${round}`);
const rounds = [0, 1, 2, 3, 4];
const admin: Actor = { id: "admin-1", name: "Alex Kim", role: "admin", agencyId: null };
const throwawayUsers = [
  throwawayAgency,
  saver,
  claimer,
  refused,
  lonely,
  ...rounds.map(racerFor),
];
const createdShiftIds: string[] = [];

const TODAY = "2026-10-18";
const pdf = (text: string, name = "license.pdf") =>
  new File([`%PDF-1.7\n${text}`], name, { type: "application/pdf" });
const png = (name = "scan.png") =>
  new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], name, {
    type: "image/png",
  });

const auditRowsFor = (actor: Actor) =>
  prisma.auditEvent.findMany({
    where: { actorId: actor.id, action: "credential_updated" },
    orderBy: { createdAt: "asc" },
  });
const countsFor = async (actor: Actor) => ({
  credentials: await prisma.credential.count({ where: { nurseId: actor.id } }),
  documents: await prisma.credentialDocument.count({ where: { credential: { nurseId: actor.id } } }),
  audits: (await auditRowsFor(actor)).length,
});

beforeAll(async () => {
  await assertSeededState();
  await prisma.agency.create({ data: { id: agencyId, name: "Throwaway Agency" } });
  await prisma.user.createMany({
    data: throwawayUsers.map((user) => ({
      id: user.id,
      email: `${user.id}@example.test`,
      name: user.name,
      role: user.role,
      agencyId: user.agencyId,
      passwordHash: "not-a-real-hash",
    })),
  });
  await prisma.credential.create({
    data: { nurseId: claimer.id, expiresOn: new Date("2020-01-01") },
  });
});

afterAll(async () => {
  const userIds = throwawayUsers.map((user) => user.id);
  await prisma.auditEvent.deleteMany({
    where: { OR: [{ actorId: { in: userIds } }, { resourceId: { in: createdShiftIds } }] },
  });
  await prisma.shift.deleteMany({ where: { agencyId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.agency.deleteMany({ where: { id: agencyId } });
  await getDb().end();
});

describe("saveCredential", () => {
  it("saves a first credential and replaces it on the second save", async () => {
    const first = await saveCredential(saver, { file: pdf("one"), expiresOn: "2027-03-01" }, TODAY);
    expect(first).toEqual({
      nurseId: saver.id,
      expiresOn: "2027-03-01",
      status: "valid",
      document: {
        fileName: "license.pdf",
        contentType: "application/pdf",
        sizeBytes: "%PDF-1.7\none".length,
        uploadedAt: expect.any(String),
      },
    });
    expect(Object.keys(first).sort()).toEqual(["document", "expiresOn", "nurseId", "status"]);

    await new Promise((resolve) => setTimeout(resolve, 20));
    const second = await saveCredential(saver, { file: png(), expiresOn: "2028-04-02" }, TODAY);
    expect(second.document).toMatchObject({
      fileName: "scan.png",
      contentType: "image/png",
      sizeBytes: 11,
    });
    expect(second.document.uploadedAt > first.document.uploadedAt).toBe(true);

    expect(await countsFor(saver)).toEqual({ credentials: 1, documents: 1, audits: 2 });
    const record = await getCredentialRecord(saver.id);
    expect(record).toEqual({ expiresOn: "2028-04-02", document: second.document });

    const audits = await auditRowsFor(saver);
    expect(audits.map((row) => row.metadata)).toEqual([
      { nurseId: saver.id, previousExpiresOn: null, expiresOn: "2027-03-01" },
      { nurseId: saver.id, previousExpiresOn: "2027-03-01", expiresOn: "2028-04-02" },
    ]);
    expect(JSON.stringify(audits)).not.toContain("scan.png");
  });

  it("lets an expired nurse claim a shift after saving a future date", async () => {
    const shift = await createShift(throwawayAgency, {
      role: "RN",
      date: "2026-12-01",
      startTime: "07:00",
      endTime: "19:00",
    });
    createdShiftIds.push(shift.id);
    await expectHttpError(claimShift(claimer, shift.id), 403);

    await saveCredential(claimer, { file: pdf("renewal"), expiresOn: "2030-01-01" });

    expect((await claimShift(claimer, shift.id)).status).toBe("filled");
  });

  it("refuses an agency and the admin without writing anything", async () => {
    for (const actor of [throwawayAgency, admin]) {
      await expectHttpError(
        saveCredential(actor, { file: pdf("x"), expiresOn: "2030-01-01" }),
        403,
        "Only nurses can upload credentials",
      );
    }
    expect(await prisma.auditEvent.count({ where: { actorId: { in: [throwawayAgency.id, admin.id] }, action: "credential_updated" } })).toBe(0);
  });

  it("accepts today, rejects yesterday and rejects non-documents, writing nothing", async () => {
    await saveCredential(refused, { file: pdf("today"), expiresOn: TODAY }, TODAY);
    const before = await countsFor(refused);
    expect(before).toEqual({ credentials: 1, documents: 1, audits: 1 });

    await expectHttpError(
      saveCredential(refused, { file: pdf("late"), expiresOn: "2026-10-17" }, TODAY),
      400,
      "Expiry date must be today or later.",
    );
    const html = new File(["<html>not a pdf</html>"], "fake.pdf", { type: "application/pdf" });
    await expectHttpError(
      saveCredential(refused, { file: html, expiresOn: "2030-01-01" }, TODAY),
      400,
      "Choose a PDF, JPG or PNG file.",
    );

    expect(await countsFor(refused)).toEqual(before);
    expect((await getCredentialRecord(refused.id)).expiresOn).toBe(TODAY);
  });

  it("stores the detected type, not the declared one", async () => {
    const jpegNamedPng = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 9])], "photo.png", {
      type: "image/png",
    });
    const dto = await saveCredential(lonely, { file: jpegNamedPng, expiresOn: "2030-01-01" });
    expect(dto.document.contentType).toBe("image/jpeg");
    const stored = await getCredentialDocument(lonely);
    expect(stored.contentType).toBe("image/jpeg");
  });

  it("serializes two concurrent first saves for the same nurse", async () => {
    for (const round of rounds) {
      const nurse = racerFor(round);
      const files = [pdf(`a-${round}`, "a.pdf"), pdf(`b-${round}-longer`, "b.pdf")];
      const dates = ["2027-01-01", "2029-02-02"];

      const results = await Promise.all(
        files.map((file, index) => saveCredential(nurse, { file, expiresOn: dates[index] })),
      );
      expect(results).toHaveLength(2);

      const counts = await countsFor(nurse);
      expect(counts).toEqual({ credentials: 1, documents: 1, audits: 2 });

      const audits = (await auditRowsFor(nurse)).map(
        (row) => row.metadata as { previousExpiresOn: string | null; expiresOn: string },
      );
      const first = audits.find((meta) => meta.previousExpiresOn === null);
      const second = audits.find((meta) => meta.previousExpiresOn !== null);
      expect(first).toBeDefined();
      expect(second?.previousExpiresOn).toBe(first?.expiresOn);

      const winner = dates.indexOf(second!.expiresOn);
      const record = await getCredentialRecord(nurse.id);
      expect(record.expiresOn).toBe(second!.expiresOn);
      expect(record.document?.fileName).toBe(winner === 0 ? "a.pdf" : "b.pdf");
      expect(record.document?.sizeBytes).toBe(files[winner].size);
    }
  }, 60_000);
});

describe("getCredentialDocument", () => {
  it("returns identical bytes", async () => {
    const file = pdf("exact bytes é", "exact.pdf");
    await saveCredential(saver, { file, expiresOn: "2030-06-01" });
    const stored = await getCredentialDocument(saver);
    expect(stored.fileName).toBe("exact.pdf");
    expect(stored.contentType).toBe("application/pdf");
    expect(Buffer.from(stored.content).equals(Buffer.from(await file.arrayBuffer()))).toBe(true);
  });

  it("is 404 without a document and 403 for other roles", async () => {
    await expectHttpError(getCredentialDocument(nurseOf("nobody")), 404, "No document on file");
    await expectHttpError(
      getCredentialDocument(admin),
      403,
      "Only nurses can view credential documents",
    );
  });
});

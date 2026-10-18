import { expect, test, type APIRequestContext } from "@playwright/test";

import { accounts, deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const shiftIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, shiftIds });
});

const CANCELLED_KEYS = [
  "agencyId",
  "agencyName",
  "cancellation",
  "claimedBy",
  "date",
  "endTime",
  "id",
  "role",
  "startTime",
  "status",
];

const agencyA = accounts[0].email;
const agencyB = accounts[1].email;
const maria = accounts[2].email;
const admin = accounts[4].email;

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  const body = await response.json();
  const sid = sessionIdOf(body.token);
  if (sid) sessionIds.push(sid);
  return body.token as string;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function filledShift(request: APIRequestContext, date: string): Promise<string> {
  const agencyToken = await tokenFor(request, agencyA);
  const created = await request.post("/api/shifts", {
    headers: bearer(agencyToken),
    data: { role: "RN", date, startTime: "07:00", endTime: "19:00" },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  shiftIds.push(id);

  const claimed = await request.post(`/api/shifts/${id}/claim`, {
    headers: bearer(await tokenFor(request, maria)),
  });
  expect(claimed.status()).toBe(200);
  return id;
}

function cancel(request: APIRequestContext, token: string, id: string, data?: unknown) {
  return request.post(`/api/shifts/${id}/cancel`, { headers: bearer(token), data });
}

test.describe("POST /api/shifts/:id/cancel", () => {
  test("an agency no-show reopens the shift and a second cancel gets 409", async ({ request }) => {
    const id = await filledShift(request, "2027-06-01");
    const token = await tokenFor(request, agencyA);

    const response = await cancel(request, token, id, {
      reason: "no-show",
      previousNurseId: "nurse-2",
      claimedBy: "nurse-2",
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(CANCELLED_KEYS);
    expect(Object.keys(body.cancellation).sort()).toEqual(["previousNurseId", "reason"]);
    expect(body).toMatchObject({
      id,
      status: "open",
      claimedBy: null,
      cancellation: { reason: "no-show", previousNurseId: "nurse-1" },
    });

    const list = await (await request.get("/api/shifts", { headers: bearer(token) })).json();
    const listed = list.shifts.find((shift: { id: string }) => shift.id === id);
    expect(listed).toMatchObject({ status: "open", claimedBy: null });
    expect(Object.keys(listed)).toHaveLength(9);

    const second = await cancel(request, token, id, { reason: "no-show" });
    expect(second.status()).toBe(409);
    expect(second.headers()["cache-control"]).toBe("no-store");
    expect(await second.json()).toEqual({ error: "Shift has no active assignment" });
  });

  test("a nurse cancels her own claim in advance but cannot record a no-show", async ({ request }) => {
    const id = await filledShift(request, "2027-06-02");
    const token = await tokenFor(request, maria);

    const refused = await cancel(request, token, id, { reason: "no-show" });
    expect(refused.status()).toBe(403);
    expect(refused.headers()["cache-control"]).toBe("no-store");
    expect(await refused.json()).toEqual({ error: "Only agencies and admins can record a no-show" });

    const response = await cancel(request, token, id, { reason: "advance" });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "open",
      claimedBy: null,
      cancellation: { reason: "advance", previousNurseId: "nurse-1" },
    });
  });

  test("another agency gets 403 and the admin can record a no-show", async ({ request }) => {
    const id = await filledShift(request, "2027-06-03");

    const other = await cancel(request, await tokenFor(request, agencyB), id, { reason: "advance" });
    expect(other.status()).toBe(403);
    expect(await other.json()).toEqual({ error: "You can only cancel your own agency's shifts" });

    const response = await cancel(request, await tokenFor(request, admin), id, { reason: "no-show" });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ status: "open", cancellation: { reason: "no-show" } });
  });

  test("a bad body gets 400 before the shift is looked up", async ({ request }) => {
    const id = await filledShift(request, "2027-06-04");
    const token = await tokenFor(request, agencyA);
    const reasonError = { error: 'Reason must be "advance" or "no-show".' };

    const malformed = await request.post(`/api/shifts/${id}/cancel`, {
      headers: { ...bearer(token), "Content-Type": "application/json" },
      data: Buffer.from("{not json"),
    });
    expect(malformed.status()).toBe(400);
    expect(malformed.headers()["cache-control"]).toBe("no-store");
    expect(await malformed.json()).toEqual({ error: "Request body must be valid JSON" });

    const missingBody = await request.post(`/api/shifts/${id}/cancel`, { headers: bearer(token) });
    expect(missingBody.status()).toBe(400);

    const missingReason = await cancel(request, token, id, {});
    expect(missingReason.status()).toBe(400);
    expect(await missingReason.json()).toEqual(reasonError);

    const unknownReason = await cancel(request, token, "shift-does-not-exist", { reason: "late" });
    expect(unknownReason.status()).toBe(400);
    expect(await unknownReason.json()).toEqual(reasonError);

    const list = await (await request.get("/api/shifts", { headers: bearer(token) })).json();
    expect(list.shifts.find((shift: { id: string }) => shift.id === id).status).toBe("filled");
  });

  test("an unknown shift gets 404", async ({ request }) => {
    const response = await cancel(request, await tokenFor(request, agencyA), "shift-does-not-exist", {
      reason: "advance",
    });

    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Shift not found" });
  });

  test("a request without a token gets 401", async ({ request }) => {
    const response = await request.post("/api/shifts/shift-1/cancel", { data: { reason: "advance" } });

    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toHaveProperty("error");
  });

  test("a reopened shift can be claimed again", async ({ request }) => {
    const id = await filledShift(request, "2027-06-05");
    await cancel(request, await tokenFor(request, agencyA), id, { reason: "no-show" });

    const claimed = await request.post(`/api/shifts/${id}/claim`, {
      headers: bearer(await tokenFor(request, maria)),
    });

    expect(claimed.status()).toBe(200);
    expect(await claimed.json()).toMatchObject({ id, status: "filled", claimedBy: "nurse-1" });
  });
});

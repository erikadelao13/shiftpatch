import { expect, test, type APIRequestContext } from "@playwright/test";

import { accounts, deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const shiftIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, shiftIds });
});

const SHIFT_KEYS = [
  "agencyId",
  "agencyName",
  "claimedBy",
  "date",
  "endTime",
  "id",
  "role",
  "startTime",
  "status",
];

const shift1 = {
  id: "shift-1",
  agencyId: "agency-a",
  agencyName: "Sunrise Health Staffing",
  role: "RN",
  date: "2026-10-02",
  startTime: "19:00",
  endTime: "07:00",
  status: "open",
  claimedBy: null,
};

const agencyA = accounts[0].email;
const maria = accounts[2].email;
const james = accounts[3].email;
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

async function postShift(request: APIRequestContext, date: string): Promise<string> {
  const token = await tokenFor(request, agencyA);
  const response = await request.post("/api/shifts", {
    headers: bearer(token),
    data: { role: "RN", date, startTime: "07:00", endTime: "19:00" },
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  shiftIds.push(id);
  return id;
}

function claim(request: APIRequestContext, token: string, id: string, data?: unknown) {
  return request.post(`/api/shifts/${id}/claim`, { headers: bearer(token), data });
}

test.describe("POST /api/shifts/:id/claim", () => {
  test("a nurse with a valid credential claims an open shift once", async ({ request }) => {
    const id = await postShift(request, "2027-03-01");
    const token = await tokenFor(request, maria);

    const response = await claim(request, token, id, { claimedBy: "nurse-2", status: "open" });

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(SHIFT_KEYS);
    expect(body).toMatchObject({ id, status: "filled", claimedBy: "nurse-1" });

    const list = await (await request.get("/api/shifts", { headers: bearer(token) })).json();
    expect(list.shifts.find((shift: { id: string }) => shift.id === id)).toEqual(body);

    const second = await claim(request, token, id);
    expect(second.status()).toBe(409);
    expect(await second.json()).toEqual({ error: "Shift is no longer available" });
  });

  test("an expired credential gets the exact 403 and the shift stays unchanged", async ({ request }) => {
    const token = await tokenFor(request, james);

    const response = await claim(request, token, "shift-1");

    expect(response.status()).toBe(403);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Credential expired, cannot claim shift" });
    const list = await (await request.get("/api/shifts", { headers: bearer(token) })).json();
    expect(list.shifts.find((shift: { id: string }) => shift.id === "shift-1")).toEqual(shift1);
  });

  test("an agency and the admin get 403", async ({ request }) => {
    const id = await postShift(request, "2027-03-02");

    for (const email of [agencyA, admin]) {
      const response = await claim(request, await tokenFor(request, email), id);
      expect(response.status()).toBe(403);
      expect(await response.json()).toEqual({ error: "Only nurses can claim shifts" });
    }
  });

  test("an unknown shift gets 404", async ({ request }) => {
    const response = await claim(request, await tokenFor(request, maria), "shift-does-not-exist");

    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Shift not found" });
  });

  test("a request without a token gets 401", async ({ request }) => {
    const response = await request.post("/api/shifts/shift-1/claim");

    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toHaveProperty("error");
  });

  test("two parallel claims give one 200 and one 409", async ({ request }) => {
    const id = await postShift(request, "2027-03-03");
    const token = await tokenFor(request, maria);

    const responses = await Promise.all([claim(request, token, id), claim(request, token, id)]);

    expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);
  });
});

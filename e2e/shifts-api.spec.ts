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
const shift2 = {
  id: "shift-2",
  agencyId: "agency-a",
  agencyName: "Sunrise Health Staffing",
  role: "LPN",
  date: "2026-10-03",
  startTime: "07:00",
  endTime: "19:00",
  status: "filled",
  claimedBy: "nurse-1",
};
const shift3 = {
  id: "shift-3",
  agencyId: "agency-b",
  agencyName: "Metro Care Partners",
  role: "RN",
  date: "2026-10-04",
  startTime: "19:00",
  endTime: "07:00",
  status: "open",
  claimedBy: null,
};

const validShift = { role: "RN", date: "2026-12-01", startTime: "19:00", endTime: "07:00" };

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

async function post(request: APIRequestContext, token: string, data: unknown) {
  const response = await request.post("/api/shifts", { headers: bearer(token), data });
  if (response.status() === 201) shiftIds.push((await response.json()).id);
  return response;
}

const agencyA = accounts[0].email;
const agencyB = accounts[1].email;
const nurse = accounts[2].email;
const admin = accounts[4].email;

test.describe("GET /api/shifts", () => {
  test("every role gets all shifts with the nine spec keys", async ({ request }) => {
    for (const email of [agencyA, agencyB, nurse, admin]) {
      const response = await request.get("/api/shifts", {
        headers: bearer(await tokenFor(request, email)),
      });
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toBe("no-store");

      const body = await response.json();
      expect(Object.keys(body)).toEqual(["shifts"]);
      for (const shift of body.shifts) {
        expect(Object.keys(shift).sort()).toEqual(SHIFT_KEYS);
      }
      expect(body.shifts).toContainEqual(shift1);
      expect(body.shifts).toContainEqual(shift2);
      expect(body.shifts).toContainEqual(shift3);
    }
  });

  test("no token gets the 401", async ({ request }) => {
    const response = await request.get("/api/shifts");
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });
});

test.describe("GET /api/agencies/:agencyId/shifts", () => {
  test("an agency gets only its own shifts", async ({ request }) => {
    const a = await request.get("/api/agencies/agency-a/shifts", {
      headers: bearer(await tokenFor(request, agencyA)),
    });
    expect(a.status()).toBe(200);
    const aBody = await a.json();
    expect(aBody.agencyId).toBe("agency-a");
    expect(aBody.shifts).toContainEqual(shift1);
    expect(aBody.shifts).toContainEqual(shift2);
    expect(aBody.shifts).not.toContainEqual(shift3);

    const b = await request.get("/api/agencies/agency-b/shifts", {
      headers: bearer(await tokenFor(request, agencyB)),
    });
    expect(await b.json()).toEqual({ agencyId: "agency-b", shifts: [shift3] });
  });

  test("another agency's id and a nurse get 403", async ({ request }) => {
    const other = await request.get("/api/agencies/agency-b/shifts", {
      headers: bearer(await tokenFor(request, agencyA)),
    });
    expect(other.status()).toBe(403);
    expect(Object.keys(await other.json())).toEqual(["error"]);

    const asNurse = await request.get("/api/agencies/agency-a/shifts", {
      headers: bearer(await tokenFor(request, nurse)),
    });
    expect(asNurse.status()).toBe(403);
  });

  test("the admin reads any agency, and an unknown one is a 404", async ({ request }) => {
    const token = await tokenFor(request, admin);
    const known = await request.get("/api/agencies/agency-b/shifts", { headers: bearer(token) });
    expect(known.status()).toBe(200);
    expect((await known.json()).shifts).toContainEqual(shift3);

    const unknown = await request.get("/api/agencies/agency-nope/shifts", {
      headers: bearer(token),
    });
    expect(unknown.status()).toBe(404);
    expect(await unknown.json()).toEqual({ error: "Agency not found" });
  });

  test("no token gets the 401", async ({ request }) => {
    const response = await request.get("/api/agencies/agency-a/shifts");
    expect(response.status()).toBe(401);
  });
});

test.describe("POST /api/shifts", () => {
  test("an agency gets 201 with an open shift that persists", async ({ request }) => {
    const token = await tokenFor(request, agencyA);
    const response = await post(request, token, validShift);
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(SHIFT_KEYS);
    expect(body).toEqual({
      id: body.id,
      agencyId: "agency-a",
      agencyName: "Sunrise Health Staffing",
      ...validShift,
      status: "open",
      claimedBy: null,
    });

    const listed = await request.get("/api/agencies/agency-a/shifts", { headers: bearer(token) });
    expect((await listed.json()).shifts).toContainEqual(body);
  });

  test("an agencyId in the body is ignored", async ({ request }) => {
    const response = await post(request, await tokenFor(request, agencyA), {
      ...validShift,
      agencyId: "agency-b",
    });
    expect(response.status()).toBe(201);
    expect((await response.json()).agencyId).toBe("agency-a");
  });

  test("accepts an overnight shift and a past date", async ({ request }) => {
    const token = await tokenFor(request, agencyA);
    expect((await post(request, token, { ...validShift, date: "2020-01-01" })).status()).toBe(201);
  });

  test("a nurse and the admin get 403", async ({ request }) => {
    for (const email of [nurse, admin]) {
      const response = await post(request, await tokenFor(request, email), validShift);
      expect(response.status()).toBe(403);
      expect(await response.json()).toEqual({ error: "Only agency accounts can post shifts" });
    }
  });

  test("no token gets the 401", async ({ request }) => {
    const response = await request.post("/api/shifts", { data: validShift });
    expect(response.status()).toBe(401);
  });

  test("invalid bodies get 400 { error }", async ({ request }) => {
    const token = await tokenFor(request, agencyA);
    const bad: unknown[] = [
      { ...validShift, role: "CNA" },
      { ...validShift, role: undefined },
      { ...validShift, date: undefined },
      { ...validShift, date: "2026-02-30" },
      { ...validShift, startTime: "24:00" },
      { ...validShift, startTime: "7:00" },
      { ...validShift, endTime: undefined },
      { ...validShift, startTime: "07:00", endTime: "07:00" },
      {},
    ];
    for (const data of bad) {
      const response = await post(request, token, data);
      expect(response.status(), JSON.stringify(data)).toBe(400);
      const body = await response.json();
      expect(Object.keys(body)).toEqual(["error"]);
      expect(typeof body.error).toBe("string");
    }
  });

  test("malformed JSON gets 400", async ({ request }) => {
    const response = await request.post("/api/shifts", {
      headers: { ...bearer(await tokenFor(request, agencyA)), "Content-Type": "application/json" },
      data: Buffer.from("{not json"),
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: "Request body must be valid JSON" });
  });
});

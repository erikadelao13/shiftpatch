import { expect, test, type APIRequestContext } from "@playwright/test";

import { accounts, deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds });
});

const agencyA = accounts[0].email;
const agencyB = accounts[1].email;
const nurse = accounts[2].email;
const admin = accounts[4].email;

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  const body = await response.json();
  const sid = sessionIdOf(body.token);
  if (sid) sessionIds.push(sid);
  return body.token as string;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const routes = [
  { path: "/api/agency/board", allowed: [agencyA, agencyB], keys: ["shifts"] },
  { path: "/api/nurse/marketplace", allowed: [nurse], keys: ["myShifts", "openShifts"] },
  { path: "/api/admin/board", allowed: [admin], keys: ["agencies", "shifts"] },
  { path: "/api/audit", allowed: [admin], keys: ["entries", "total"] },
  { path: "/api/credentials", allowed: [nurse], keys: ["document", "status"] },
  { path: "/api/timesheets", allowed: [agencyA, agencyB, nurse, admin], keys: ["entries"] },
];

const everyone = [agencyA, agencyB, nurse, admin];

for (const route of routes) {
  test.describe(`GET ${route.path}`, () => {
    test("no session gets 401", async ({ request }) => {
      const response = await request.get(route.path);
      expect(response.status()).toBe(401);
      expect(response.headers()["cache-control"]).toBe("no-store");
    });

    test("the wrong role gets 403", async ({ request }) => {
      for (const email of everyone.filter((candidate) => !route.allowed.includes(candidate))) {
        const response = await request.get(route.path, {
          headers: bearer(await tokenFor(request, email)),
        });
        expect(response.status(), email).toBe(403);
        expect(response.headers()["cache-control"]).toBe("no-store");
        expect(await response.json()).toEqual({ error: expect.any(String) });
      }
    });

    test("an allowed role gets 200, no-store and the documented body", async ({ request }) => {
      for (const email of route.allowed) {
        const response = await request.get(route.path, {
          headers: bearer(await tokenFor(request, email)),
        });
        expect(response.status(), email).toBe(200);
        expect(response.headers()["cache-control"]).toBe("no-store");
        expect(Object.keys(await response.json()).sort()).toEqual(route.keys);
      }
    });
  });
}

test("the agency board holds only the caller's own agency", async ({ request }) => {
  const idsOf = async (email: string) => {
    const response = await request.get("/api/agency/board", {
      headers: bearer(await tokenFor(request, email)),
    });
    return ((await response.json()).shifts as { id: string }[]).map((shift) => shift.id);
  };

  const boardA = await idsOf(agencyA);
  const boardB = await idsOf(agencyB);
  expect(boardA).toEqual(expect.arrayContaining(["shift-1", "shift-2"]));
  expect(boardA).not.toContain("shift-3");
  expect(boardB).toContain("shift-3");
  expect(boardB).not.toContain("shift-1");
  expect(boardB).not.toContain("shift-2");
});

test("timesheets are scoped by the caller's role", async ({ request }) => {
  const entriesOf = async (email: string) => {
    const response = await request.get("/api/timesheets", {
      headers: bearer(await tokenFor(request, email)),
    });
    return (await response.json()).entries as {
      shiftId: string;
      nurseName: string;
      agencyName: string;
    }[];
  };

  const forAdmin = await entriesOf(admin);
  const forNurse = await entriesOf(nurse);
  const forAgencyA = await entriesOf(agencyA);
  const forAgencyB = await entriesOf(agencyB);

  expect(forAdmin.map((entry) => entry.shiftId)).toContain("shift-2");
  expect(forNurse.map((entry) => entry.shiftId)).toContain("shift-2");
  expect(forAgencyA.map((entry) => entry.shiftId)).toContain("shift-2");
  expect(forAgencyB.map((entry) => entry.shiftId)).not.toContain("shift-2");
  for (const entry of forAgencyA) expect(entry.agencyName).toBe(accounts[0].name);
  for (const entry of forNurse) expect(entry.nurseName).toBe(accounts[2].name);
});

test("the credential body carries the status and the document summary", async ({ request }) => {
  const response = await request.get("/api/credentials", {
    headers: bearer(await tokenFor(request, nurse)),
  });
  const body = await response.json();
  expect(body.status.state).toMatch(/^(valid|expired|missing)$/);
});

import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { accounts, deleteOwnRows, PASSWORD, sessionIdOf } from "./support";

const sessionIds: string[] = [];
const emails: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, emails });
});

async function login(
  request: import("@playwright/test").APIRequestContext,
  email: string,
  password = PASSWORD,
) {
  return request.post("/api/auth/login", { data: { email, password } });
}

async function loginToken(
  request: import("@playwright/test").APIRequestContext,
  email: string,
) {
  const body = await (await login(request, email)).json();
  const sid = sessionIdOf(body.token);
  if (sid) sessionIds.push(sid);
  return body.token as string;
}

test.describe("POST /api/auth/login", () => {
  for (const account of accounts) {
    test(`${account.email} gets the exact spec body`, async ({ request }) => {
      const response = await login(request, account.email);
      expect(response.status()).toBe(200);

      const body = await response.json();
      const sid = sessionIdOf(body.token);
      if (sid) sessionIds.push(sid);

      expect(Object.keys(body).sort()).toEqual(["token", "user"]);
      expect(typeof body.token).toBe("string");
      expect(body.token.split(".")).toHaveLength(3);
      expect(body.user).toEqual({ id: account.id, name: account.name, role: account.role });
    });
  }

  test("an unknown email gets the exact 401", async ({ request }) => {
    const email = `e2e-${randomUUID()}@example.test`;
    emails.push(email);

    const response = await login(request, email);

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid email or password" });
  });

  test("a wrong password gets the same exact 401", async ({ request }) => {
    // Alex's failure row is cleared by the next successful Alex sign-in.
    const response = await login(request, "alex.kim@example.com", "wrong-password");
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid email or password" });

    await loginToken(request, "alex.kim@example.com");
  });

  test("malformed JSON gets 400 { error }", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      headers: { "content-type": "application/json" },
      data: "{ not json",
    });

    expect(response.status()).toBe(400);
    expect(Object.keys(await response.json())).toEqual(["error"]);
  });

  test("missing fields get 400 { error }", async ({ request }) => {
    for (const data of [{}, { email: "alex.kim@example.com" }, { password: PASSWORD }, []]) {
      const response = await request.post("/api/auth/login", { data });

      expect(response.status(), JSON.stringify(data)).toBe(400);
      expect(Object.keys(await response.json())).toEqual(["error"]);
    }
  });

  test("never echoes the password or a hash", async ({ request }) => {
    const response = await login(request, "alex.kim@example.com");
    const text = await response.text();
    const sid = sessionIdOf(JSON.parse(text).token);
    if (sid) sessionIds.push(sid);

    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain("scrypt");
    expect(text).not.toContain("passwordHash");
  });
});

test.describe("authenticated requests", () => {
  test("a Bearer token works on /api/auth/me, then dies on logout", async ({ request }) => {
    const token = await loginToken(request, "maria.lopez@example.com");
    const auth = { Authorization: `Bearer ${token}` };

    const me = await request.get("/api/auth/me", { headers: auth });
    expect(me.status()).toBe(200);
    expect(await me.json()).toEqual({
      user: { id: "nurse-1", name: "Maria Lopez", role: "nurse", agencyId: null },
    });

    const logout = await request.post("/api/auth/logout", { headers: auth });
    expect(logout.status()).toBe(204);

    const after = await request.get("/api/auth/me", { headers: auth });
    expect(after.status()).toBe(401);
    expect(Object.keys(await after.json())).toEqual(["error"]);
  });

  test("an agency token carries its agency id", async ({ request }) => {
    const token = await loginToken(request, "admin@sunrisehealth.example");

    const me = await request.get("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect((await me.json()).user).toEqual({
      id: "agency-a",
      name: "Sunrise Health Staffing",
      role: "agency",
      agencyId: "agency-a",
    });
  });

  test("no credentials gets 401 { error }", async ({ request }) => {
    const response = await request.get("/api/auth/me");

    expect(response.status()).toBe(401);
    expect(Object.keys(await response.json())).toEqual(["error"]);
  });

  test("a tampered token gets 401", async ({ request }) => {
    const token = await loginToken(request, "maria.lopez@example.com");
    const [header, payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), role: "admin", sub: "admin-1" }),
    ).toString("base64url");

    for (const bad of [`${header}.${forged}.${signature}`, `${token}x`, "garbage"]) {
      const response = await request.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${bad}` },
      });
      expect(response.status()).toBe(401);
      expect(Object.keys(await response.json())).toEqual(["error"]);
    }
  });

  test("an invalid Bearer never falls back to a valid cookie", async ({ request }) => {
    const token = await loginToken(request, "maria.lopez@example.com");

    const response = await request.get("/api/auth/me", {
      headers: {
        Authorization: "Bearer garbage",
        Cookie: `shiftpatch_session=${token}`,
      },
    });
    expect(response.status()).toBe(401);

    // The same cookie alone is accepted, so the 401 above came from the Bearer.
    const cookieOnly = await request.get("/api/auth/me", {
      headers: { Cookie: `shiftpatch_session=${token}` },
    });
    expect(cookieOnly.status()).toBe(200);
  });

  test("a cookie-authenticated POST without a matching Origin gets 403", async ({ request }) => {
    const token = await loginToken(request, "maria.lopez@example.com");

    const response = await request.post("/api/auth/logout", {
      headers: { Cookie: `shiftpatch_session=${token}`, Origin: "https://evil.example" },
    });

    expect(response.status()).toBe(403);
    expect(Object.keys(await response.json())).toEqual(["error"]);

    const stillValid = await request.get("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(stillValid.status()).toBe(200);
  });
});

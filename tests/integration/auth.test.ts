import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fixtureUsers, FIXTURE_PASSWORD } from "../../prisma/fixtures";
import {
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_FAILURE_LIMIT,
} from "@/features/auth/constants";
import { loginSchema } from "@/features/auth/schemas";
import { authenticate } from "@/features/auth/server/login";
import { hashPassword } from "@/features/auth/server/password";
import { resolveSession, revokeSession } from "@/features/auth/server/sessions";
import { verifyToken } from "@/features/auth/server/token";
import { getDb, getPrisma } from "@/shared/server/db";
import { HttpError } from "@/shared/server/errors";

// Runs on the Neon dev branch and needs `pnpm db:seed`. Creates uniquely
// identified rows and deletes only those; never resets the database.
const prisma = getPrisma();
const runId = randomUUID().slice(0, 8);
const PASSWORD = "Correct-horse-1!";

const throwawayUsers: { id: string; email: string }[] = [];
const sessionIds: string[] = [];
const attemptEmails: string[] = [];

async function createThrowawayUser(label: string) {
  const user = {
    id: `test-${runId}-${label}`,
    email: `test-${runId}-${label}@example.test`,
  };
  await prisma.user.create({
    data: {
      ...user,
      name: `Test ${label}`,
      role: "nurse",
      passwordHash: await hashPassword(PASSWORD),
    },
  });
  throwawayUsers.push(user);
  attemptEmails.push(user.email);
  return user;
}

async function expectHttpError(promise: Promise<unknown>, status: number, message?: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  if (message) expect((error as HttpError).message).toBe(message);
}

async function loginAndTrack(email: string, password: string) {
  const result = await authenticate({ email, password });
  const claims = await verifyToken(result.token);
  if (claims) sessionIds.push(claims.sessionId);
  return { result, claims: claims! };
}

beforeAll(async () => {
  const seeded = await prisma.user.count({
    where: { id: { in: fixtureUsers.map((user) => user.id) } },
  });
  if (seeded !== fixtureUsers.length) {
    throw new Error("The dev branch is not seeded. Run `pnpm db:seed` first.");
  }
});

afterAll(async () => {
  await prisma.apiSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: attemptEmails } } });
  await prisma.user.deleteMany({
    where: { id: { in: throwawayUsers.map((user) => user.id) } },
  });
  await getDb().end();
});

describe("authenticate: the five spec accounts", () => {
  it.each(fixtureUsers)("signs in $email", async (fixture) => {
    const { result, claims } = await loginAndTrack(fixture.email, FIXTURE_PASSWORD);

    expect(result.user).toEqual({
      id: fixture.id,
      name: fixture.name,
      role: fixture.role,
    });
    expect(claims).toMatchObject({ userId: fixture.id, role: fixture.role });

    const actor = await resolveSession(claims);
    expect(actor).toEqual({
      id: fixture.id,
      name: fixture.name,
      role: fixture.role,
      agencyId: fixture.agencyId,
    });
  });

  it("matches the email case-insensitively, ignoring surrounding spaces", async () => {
    const input = loginSchema.parse({
      email: "  Maria.Lopez@Example.com ",
      password: FIXTURE_PASSWORD,
    });
    const result = await authenticate(input);
    const claims = await verifyToken(result.token);
    if (claims) sessionIds.push(claims.sessionId);

    expect(result.user.id).toBe("nurse-1");
  });
});

describe("authenticate: failures", () => {
  it("returns the exact 401 for a wrong password", async () => {
    const user = await createThrowawayUser("wrong-password");

    await expectHttpError(
      authenticate({ email: user.email, password: "nope" }),
      401,
      INVALID_CREDENTIALS_MESSAGE,
    );
  });

  it("returns the same 401 for an unknown email", async () => {
    const email = `test-${runId}-unknown@example.test`;
    attemptEmails.push(email);

    await expectHttpError(
      authenticate({ email, password: PASSWORD }),
      401,
      INVALID_CREDENTIALS_MESSAGE,
    );
  });
});

describe("authenticate: throttle", () => {
  it("blocks the attempt after the failure limit, even with the right password", async () => {
    const user = await createThrowawayUser("throttle");

    for (let i = 0; i < LOGIN_FAILURE_LIMIT; i++) {
      await expectHttpError(
        authenticate({ email: user.email, password: "wrong" }),
        401,
      );
    }

    await expectHttpError(authenticate({ email: user.email, password: PASSWORD }), 429);
    await expectHttpError(authenticate({ email: user.email, password: "wrong" }), 429);
  });

  it("does not throttle other emails", async () => {
    const { result } = await loginAndTrack("alex.kim@example.com", FIXTURE_PASSWORD);

    expect(result.user.role).toBe("admin");
  });

  it("clears an email's failures after a successful sign-in", async () => {
    const user = await createThrowawayUser("clears");

    for (let i = 0; i < 3; i++) {
      await expectHttpError(authenticate({ email: user.email, password: "wrong" }), 401);
    }
    expect(await prisma.loginAttempt.count({ where: { email: user.email } })).toBe(3);

    await loginAndTrack(user.email, PASSWORD);

    expect(await prisma.loginAttempt.count({ where: { email: user.email } })).toBe(0);
  });
});

describe("sessions", () => {
  it("rejects a revoked session", async () => {
    const user = await createThrowawayUser("revoked");
    const { claims } = await loginAndTrack(user.email, PASSWORD);
    expect(await resolveSession(claims)).not.toBeNull();

    await revokeSession(claims.sessionId);

    expect(await resolveSession(claims)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const user = await createThrowawayUser("expired");
    const { claims } = await loginAndTrack(user.email, PASSWORD);

    await prisma.apiSession.update({
      where: { id: claims.sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await resolveSession(claims)).toBeNull();
  });

  it("rejects a session presented under another user's id", async () => {
    const user = await createThrowawayUser("mismatch");
    const { claims } = await loginAndTrack(user.email, PASSWORD);

    expect(await resolveSession({ ...claims, userId: "admin-1" })).toBeNull();
  });

  it("rejects an unknown session id", async () => {
    expect(
      await resolveSession({ userId: "nurse-1", sessionId: randomUUID(), role: "nurse" }),
    ).toBeNull();
  });
});

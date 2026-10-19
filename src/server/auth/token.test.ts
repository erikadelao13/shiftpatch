import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { signToken, verifyToken } from "./token";

const claims = { userId: "nurse-1", sessionId: "session-1", role: "nurse" } as const;
const inOneHour = () => new Date(Date.now() + 3_600_000);

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

function realSecret() {
  return secretKey(process.env.AUTH_JWT_SECRET!);
}

// A token signed by hand, to vary one claim at a time.
function craft({
  key = realSecret(),
  issuer = "shiftpatch",
  audience = "shiftpatch-api",
  expiresAt = inOneHour(),
  payload = { sid: "session-1", role: "nurse" } as Record<string, unknown>,
  subject = "nurse-1" as string | null,
} = {}) {
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000));
  if (subject) jwt.setSubject(subject);
  return jwt.sign(key);
}

describe("session tokens", () => {
  it("round-trips the claims", async () => {
    const token = await signToken(claims, inOneHour());

    expect(await verifyToken(token)).toEqual(claims);
  });

  it("accepts a hand-crafted token with the expected claims", async () => {
    expect(await verifyToken(await craft())).toEqual(claims);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await craft({
      key: secretKey("a-different-secret-that-is-long-enough!!"),
    });

    expect(await verifyToken(token)).toBeNull();
  });

  it("rejects the wrong audience and the wrong issuer", async () => {
    expect(await verifyToken(await craft({ audience: "someone-else" }))).toBeNull();
    expect(await verifyToken(await craft({ issuer: "someone-else" }))).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await craft({ expiresAt: new Date(Date.now() - 60_000) });

    expect(await verifyToken(token)).toBeNull();
  });

  it("rejects an unsigned alg:none token", async () => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({
      iss: "shiftpatch",
      aud: "shiftpatch-api",
      sub: "admin-1",
      sid: "session-1",
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.`;

    expect(await verifyToken(token)).toBeNull();
  });

  it("rejects a token whose payload was changed after signing", async () => {
    const [header, , signature] = (await signToken(claims, inOneHour())).split(".");
    const forged = Buffer.from(
      JSON.stringify({
        iss: "shiftpatch",
        aud: "shiftpatch-api",
        sub: "admin-1",
        sid: "session-1",
        role: "admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");

    expect(await verifyToken(`${header}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects tokens missing a subject, a session id, or a valid role", async () => {
    expect(await verifyToken(await craft({ subject: null }))).toBeNull();
    expect(await verifyToken(await craft({ payload: { role: "nurse" } }))).toBeNull();
    expect(
      await verifyToken(await craft({ payload: { sid: "s", role: "superuser" } })),
    ).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("not-a-jwt")).toBeNull();
    expect(await verifyToken("a.b.c")).toBeNull();
  });
});

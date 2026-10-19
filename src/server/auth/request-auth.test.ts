import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/errors";

import { SESSION_COOKIE } from "./constants";
import type { Actor } from "@/contracts/auth/types";
import { requireActor, requireSession } from "./request-auth";
import { resolveSession } from "./sessions";
import { signToken } from "./token";

// The guard's decisions are under test, not the database.
vi.mock("./sessions", () => ({ resolveSession: vi.fn() }));

const actor: Actor = { id: "nurse-1", name: "Maria Lopez", role: "nurse", agencyId: null };
const URL_ = "http://localhost:3000/api/auth/me";

async function validToken() {
  return signToken(
    { userId: actor.id, sessionId: "session-1", role: actor.role },
    new Date(Date.now() + 3_600_000),
  );
}

function request(init: { method?: string; headers?: Record<string, string> } = {}) {
  return new Request(URL_, init);
}

async function statusOf(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof HttpError) return error.status;
    throw error;
  }
}

beforeEach(() => {
  vi.mocked(resolveSession).mockReset().mockResolvedValue(actor);
});

describe("requireActor", () => {
  it("returns 401 with neither a Bearer token nor a cookie", async () => {
    expect(await statusOf(requireActor(request()))).toBe(401);
  });

  it("accepts a valid Bearer token and returns the database actor", async () => {
    const token = await validToken();

    const result = await requireSession(
      request({ headers: { authorization: `Bearer ${token}` } }),
    );

    expect(result).toEqual({ actor, sessionId: "session-1", source: "bearer" });
  });

  it("accepts a valid cookie on a safe method", async () => {
    const token = await validToken();

    const result = await requireSession(
      request({ headers: { cookie: `other=1; ${SESSION_COOKIE}=${token}` } }),
    );

    expect(result.source).toBe("cookie");
  });

  it("never falls back to a valid cookie after an invalid Bearer token", async () => {
    const cookie = `${SESSION_COOKIE}=${await validToken()}`;

    const status = await statusOf(
      requireActor(request({ headers: { authorization: "Bearer not-a-token", cookie } })),
    );

    expect(status).toBe(401);
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it("treats a non-Bearer Authorization header as invalid, not as absent", async () => {
    const cookie = `${SESSION_COOKIE}=${await validToken()}`;

    const status = await statusOf(
      requireActor(request({ headers: { authorization: "Basic abc", cookie } })),
    );

    expect(status).toBe(401);
  });

  it("returns 401 when the session is revoked or unknown", async () => {
    vi.mocked(resolveSession).mockResolvedValue(null);
    const token = await validToken();

    const status = await statusOf(
      requireActor(request({ headers: { authorization: `Bearer ${token}` } })),
    );

    expect(status).toBe(401);
  });

  describe("Origin check on cookie-authenticated unsafe methods", () => {
    async function post(headers: Record<string, string>) {
      const cookie = `${SESSION_COOKIE}=${await validToken()}`;
      return statusOf(
        requireActor(request({ method: "POST", headers: { cookie, ...headers } })),
      );
    }

    it("rejects a missing Origin", async () => {
      expect(await post({})).toBe(403);
    });

    it("rejects a different Origin", async () => {
      expect(await post({ origin: "https://evil.example" })).toBe(403);
    });

    it("rejects an unparseable Origin", async () => {
      expect(await post({ origin: "null" })).toBe(403);
    });

    it("accepts the same Origin", async () => {
      expect(await post({ origin: "http://localhost:3000" })).toBeNull();
    });

    it("does not require an Origin for Bearer requests", async () => {
      const token = await validToken();

      const status = await statusOf(
        requireActor(
          request({ method: "POST", headers: { authorization: `Bearer ${token}` } }),
        ),
      );

      expect(status).toBeNull();
    });
  });
});

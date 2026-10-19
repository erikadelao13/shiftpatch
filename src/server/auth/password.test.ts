import { describe, expect, it } from "vitest";

import {
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("Trial2026!");

    expect(await verifyPassword("Trial2026!", hash)).toBe(true);
    expect(await verifyPassword("trial2026!", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("uses a random salt, so equal passwords hash differently", async () => {
    const [a, b] = await Promise.all([
      hashPassword("Trial2026!"),
      hashPassword("Trial2026!"),
    ]);

    expect(a).not.toBe(b);
    expect(a).not.toContain("Trial2026!");
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "plaintext")).toBe(false);
    expect(await verifyPassword("x", "scrypt1$abcd$ef")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$abcd$ef")).toBe(false);
  });

  it("runs the dummy check without throwing", async () => {
    await expect(verifyAgainstDummy("anything")).resolves.toBeUndefined();
  });
});

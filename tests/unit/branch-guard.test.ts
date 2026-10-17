import { afterEach, describe, expect, it, vi } from "vitest";

import { assertDevBranch, devOnlyPrismaCommand } from "../../prisma/branch-guard";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertDevBranch", () => {
  it("allows the dev branch", () => {
    vi.stubEnv("NEON_BRANCH", "dev");

    expect(() => assertDevBranch("seed")).not.toThrow();
  });

  it("refuses production, other branches, and an unset value", () => {
    for (const value of ["production", "main", "Dev", ""]) {
      vi.stubEnv("NEON_BRANCH", value);

      expect(() => assertDevBranch("seed")).toThrow(/Refusing to seed/);
    }
  });
});

describe("devOnlyPrismaCommand", () => {
  const argv = (...args: string[]) => ["node", "prisma", ...args];

  it("names the guarded commands", () => {
    expect(devOnlyPrismaCommand(argv("migrate", "dev", "--name", "x"))).toBe("migrate dev");
    expect(devOnlyPrismaCommand(argv("migrate", "reset", "--force"))).toBe("migrate reset");
    expect(devOnlyPrismaCommand(argv("db", "push"))).toBe("db push");
  });

  it("ignores everything else", () => {
    expect(devOnlyPrismaCommand(argv("generate"))).toBeNull();
    expect(devOnlyPrismaCommand(argv("validate"))).toBeNull();
    expect(devOnlyPrismaCommand(argv("migrate", "deploy"))).toBeNull();
    expect(devOnlyPrismaCommand(argv("migrate", "status"))).toBeNull();
    expect(devOnlyPrismaCommand(argv("db", "seed"))).toBeNull();
  });
});

// Production credentials live in `.env`; the dev branch lives in
// `.env.development`. Every tool that writes to the database calls this
// first, so a mis-pointed environment fails before any query runs.
export function assertDevBranch(action: string): void {
  const branch = process.env.NEON_BRANCH;
  if (branch !== "dev") {
    throw new Error(
      `Refusing to ${action}: NEON_BRANCH is ${
        branch ? `"${branch}"` : "not set"
      }, expected "dev". Check that .env.development is loaded and holds the dev branch.`,
    );
  }
}

const DEV_ONLY_COMMANDS: ReadonlyArray<readonly [string, string]> = [
  ["migrate", "dev"],
  ["migrate", "reset"],
  ["db", "push"],
];

// Returns the guarded Prisma command named in argv (for example "migrate dev"),
// or null when the invocation is not one of them.
export function devOnlyPrismaCommand(argv: readonly string[]): string | null {
  const args = argv.slice(2);
  for (const [group, sub] of DEV_ONLY_COMMANDS) {
    const index = args.indexOf(group);
    if (index !== -1 && args[index + 1] === sub) {
      return `${group} ${sub}`;
    }
  }
  return null;
}

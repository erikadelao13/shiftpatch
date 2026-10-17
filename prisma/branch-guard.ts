// `.env` holds production, so every database writer calls this first and a
// mis-pointed environment fails before any query runs.
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

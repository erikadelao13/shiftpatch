# Harness hardening: pinned Node, forbidden files, edit guards

Status: Active
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-16

## Goal and acceptance criteria

Turn three things that were only written down into mechanical behavior, and close the hook-activation item left open by [2026-10-16-claude-code-harness-adaptation.md](../completed/2026-10-16-claude-code-harness-adaptation.md). Agreed with the owner 2026-10-16 as recommendations 1–3.

Acceptance:

- [x] The adaptation plan's activation criterion is closed with live evidence, and that plan moves to `completed/` with links repaired.
- [ ] Git hooks and Claude Code Bash commands run on the Node version in `.nvmrc` **without changing the global nvm default**, demonstrated from a shell whose default is Node 18. *Git hooks: demonstrated. Claude Code Bash: unit-tested only; needs the next session.*
- [x] `.npmrc` sets `engine-strict=true`: any `pnpm` command under Node 18 fails immediately with `ERR_PNPM_UNSUPPORTED_ENGINE`; under the pinned Node, `pnpm install --frozen-lockfile` and `pnpm verify` pass.
- [x] `pnpm check:docs` fails when `CLAUDE.md`, `CLAUDE.local.md`, or `.claude/CLAUDE.md` exists in the repository, including as a symlink. Tested.
- [x] `.claude/settings.json` denies Claude Code file edits to `.next/**`, `node_modules/**`, `next-env.d.ts`, and those instruction files, with syntax confirmed against the official reference. Live enforcement is reported as observed or as unobserved — not assumed.
- [x] HOOKS, VERIFICATION, README, and TD-7/TD-9 describe the new behavior; `pnpm check:docs`, both unit suites, and `pnpm verify` pass.

Non-goals: changing the global nvm default (owner's call; other projects may rely on Node 18), CI, PostToolUse lint hooks, committing.

## Context

Baseline: the shell and Claude Code's Bash tool resolve `node` to v18.17.1 (nvm default). `next --version` refuses to run under it, so `pnpm build`, `pnpm verify`, and the `pre-push` hook fail unless someone runs `nvm use` first. `engines` only warns. `AGENTS.md` forbids `CLAUDE.md` and edits to `.next/`, `node_modules/`, `next-env.d.ts`, but nothing enforces either. nvm 24.16.0 is installed at `$NVM_DIR/versions/node/v24.16.0`.

Affected paths: `.npmrc`, `scripts/pinned_node.py` (new, core), `scripts/check_harness.py`, `scripts/harness.json`, `scripts/claude_hooks.py`, `.githooks/*`, `.claude/settings.json`, tests, and docs.

## Steps and progress

- [x] Confirm both hooks fired live in a fresh session (transcript evidence).
- [x] Confirm `engine-strict=true` behavior under Node 18 and Node 24.
- [x] Add the core Node resolver, use it from the Git hooks and the Claude Code adapter.
- [x] Add forbidden paths to the checker; add deny rules to `.claude/settings.json`.
- [x] Update docs; run every check; close the adaptation plan.
- [ ] Next session: confirm the `CLAUDE_ENV_FILE` pin, then move this plan to `completed/`.

## Decisions and discoveries

- **2026-10-16 — project-scoped Node, not a global default.** The owner did not choose between the two; changing `nvm alias default` affects every project on the machine, so the reversible, repository-local option was taken. `nvm alias default 24.16.0` remains available to the owner.
- **2026-10-16 — one resolver, two callers.** `scripts/pinned_node.py` is core (standard library, no agent tool). The Git hooks call it as a command; the Claude Code adapter imports it. The adapter depends on the core, never the reverse.
- **2026-10-16 — docs corrected the plan in two places** (claude-code-guide lookup against code.claude.com, quoted in [../../HOOKS.md](../../HOOKS.md)): `Write(...)` permission rules are accepted but never consulted, so every rule is `Edit(...)`; and settings edits, including `permissions` and `hooks`, reload in a running session — the previous HOOKS.md claim that they did not was wrong and has been replaced.
- **2026-10-16 — consequence of `engine-strict`:** `pnpm check:docs` itself now refuses to run under Node 18. The Stop hook is unaffected because it calls `scripts/check_harness.py` directly through Python.
- **2026-10-16 — remaining TD-9 gap is deliberate:** instruction files in directories *above* the repository also suppress `AGENTS.md`, but a repository check should not inspect the machine outside it. Recorded in TD-9 with a follow-up.

## Verification

Run 2026-10-16 from the repository root, from a shell whose default Node is v18.17.1.

| Command or probe | Result |
| --- | --- |
| Session transcript, SessionStart and Stop records | both hooks exit 0 (309 ms, 112 ms); Stop output `{}` |
| `pnpm lint` / `pnpm install --frozen-lockfile` under Node 18 with `.npmrc` | both exit 1, `ERR_PNPM_UNSUPPORTED_ENGINE … Got: v18.17.1` |
| Same under Node 24.16.0 | `lint` exit 0; install "Lockfile is up to date … Already up to date" |
| `python3 scripts/pinned_node.py` | `/Users/erikadelao/.nvm/versions/node/v24.16.0/bin`; with `NVM_DIR=/nonexistent`, exit 1 |
| `sh .githooks/pre-commit` (Node 18 shell) | check:docs, lint, typecheck pass; exit 0 |
| `.githooks/pre-push` with one ref line (Node 18 shell) | full `pnpm verify` — build, typecheck, e2e 1 passed; exit 0 |
| Write `.next/permission-probe.txt` | refused: "denied by your permission settings" |
| `echo probe > .next/permission-probe.txt` (Bash) | refused |
| Write `CLAUDE.md` | refused |
| Scratch copy + real `harness.json`, all three instruction files present (one a symlink) | exit 1, three "Forbidden harness path present" lines |
| Scratch copy with `.claude/`, `claude_hooks.py`, its tests removed | `check_harness.py` passes; `test_harness.py` OK; no core file references the adapter |
| `python3 -m unittest … test_harness.py` | 10 tests OK (5 → 10: forbidden paths, resolver) |
| `python3 -m unittest … test_claude_hooks.py` | 10 tests OK (8 → 10: env-file pin, skip/error path) |
| `pnpm check:docs && pnpm lint && pnpm typecheck` (pinned Node), after doc edits | pass |

**Outstanding.** The `CLAUDE_ENV_FILE` pin has not run live: `SessionStart` fires only at session start, and the docs do not say whether exec-form hooks receive the variable. If they don't, the pin is skipped silently and `engine-strict` makes `pnpm` fail loudly — never a silent wrong-Node pass. A Claude Code process that writes files without naming them (a Python script, for example) is not covered by the deny rules.

## Handoff or outcome

Next concrete action for the owner: start a new Claude Code session here, and confirm the startup context ends with "Bash commands use the Node pinned in .nvmrc" and `node -v` reports v24.16.0. Then tick the remaining criterion and move this plan to `completed/`.

Nothing has been committed.

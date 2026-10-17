# Retarget the harness from Codex to Claude Code

Status: Complete
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-16

## Goal and acceptance criteria

Make the harness tool-neutral at its core and keep exactly one agent-tool adapter, for **Claude Code**. The Codex integration created in [2026-10-16-project-harness-setup.md](../active/2026-10-16-project-harness-setup.md) is obsolete and must be removed after inspection. Product, architecture, design, existing plans, skills, and application code are preserved.

Acceptance:

- [x] No `.codex/` directory and no Codex helper remain; the only reference left is the dated removal record in [../../HOOKS.md](../../HOOKS.md).
- [x] The core (documents, `pnpm` commands, Git hooks) runs with **no adapter file present** — demonstrated, not asserted.
- [x] `scripts/test_harness.py` imports no adapter; adapter tests live in `scripts/test_claude_hooks.py`.
- [x] `.claude/settings.json` matches Claude Code's documented hook schema, confirmed against the official reference for the installed version.
- [x] A blocked Stop cannot loop, and the bound is tested.
- [x] The three existing skills are discoverable by Claude Code with no second copy of their content.
- [x] `pnpm check:docs`, `pnpm lint`, `pnpm build`, `pnpm typecheck`, `pnpm test:e2e`, and both unit suites pass.
- [x] **Hooks reviewed and accepted in a new Claude Code session** — observed 2026-10-16; see Verification.

Non-goals: product features, backend decisions, CI, deployment, committing, and any change to global or user-level agent configuration.

## Context

Target tool: **Claude Code 2.1.302** (`claude --version`). Requirements from the owner: make shared instructions and checks tool-neutral, keep hooks only for the selected tool, remove obsolete generated integrations after inspecting them, update documentation and verification, and preserve existing product, architecture, design, plans, skills, and application code.

Baseline found at the start of this change:

- `.codex/hooks.json` invoking `python3 "$(git rev-parse --show-toplevel)/scripts/codex_hooks.py"` on SessionStart and Stop.
- `scripts/claude_hooks.py` present but **byte-identical to the bundled Codex helper** — renamed, never adapted. Verified with `diff`.
- `scripts/test_harness.py` importing `codex_hooks`, so the core test suite could not run without the adapter.
- Codex named in `docs/HOOKS.md`, `docs/VERIFICATION.md`, and `.agents/skills/harness-maintenance/SKILL.md`.
- Nothing from the previous setup was committed; the whole harness is still untracked.

## Steps and progress

- [x] Inspect the Codex integration for custom behavior and dependencies before deleting anything.
- [x] Confirm Claude Code's hook schema, skill discovery, and instruction-file rules against current official documentation.
- [x] Replace the renamed Codex helper with a real Claude Code adapter; split core and adapter tests.
- [x] Remove `.codex/`; add `.claude/settings.json` and per-skill symlinks under `.claude/skills/`.
- [x] Make AGENTS.md, the docs index, VERIFICATION, HOOKS, and the maintenance skill tool-neutral, with the adapter clearly separated.
- [x] Run every check, including the core with the adapter removed.
- [x] Owner: start a new Claude Code session in this repository and accept the hook review prompt.

## Decisions and discoveries

- **2026-10-16 — the Codex integration carried no custom behavior.** `.codex/hooks.json` was the generated starting config with only the project name substituted into `statusMessage`; its sole dependency was `scripts/codex_hooks.py`, which in turn imported `load_config` and `local_path` from `check_harness.py`. Nothing else referenced it except documentation and the test file. Removal was therefore safe, and the inbound-reference list was checked with `grep` first.
- **2026-10-16 — `scripts/claude_hooks.py` was a rename, not an adaptation.** `diff` against the bundled Codex helper showed zero differences. A rename does not make a Codex helper a Claude Code helper, so it was rewritten.
- **2026-10-16 — no `CLAUDE.md`, deliberately.** Claude Code reads `AGENTS.md` natively from v2.1.277, *but only while no `CLAUDE.md` or `CLAUDE.local.md` exists in the working directory or above it*. Adding a pointer file would therefore have **disabled** the canonical entry point rather than supporting it. Recorded in AGENTS.md so nobody adds one later. A contributor who keeps a personal `CLAUDE.local.md` must set **Project instructions** to `claude-md-and-agents-md` via `/config`; noted as TD-9.
- **2026-10-16 — skills surfaced by symlink, not by copying.** Claude Code discovers `.claude/skills/<name>/SKILL.md` and explicitly does not read anything under `.agents/`. Its documentation states a skill entry may be a symlink to a directory elsewhere on disk, so `.agents/skills/` stays canonical and `.claude/skills/<name>` links to it. One copy of each procedure, no drift.
- **2026-10-16 — the Stop loop bound could not be inherited.** The Codex helper relied on `stop_hook_active`. Claude Code's documented Stop payload does not include that field, so a direct port risked an unbounded block loop. The adapter now records a temp-directory marker keyed by repository root and `session_id`, blocks at most once per session, expires the marker after an hour, clears it when the check passes, still honors `stop_hook_active` when present, and swallows marker I/O errors. Five of the eight adapter tests cover this.
- **2026-10-16 — exec form for the hook command.** Claude Code's documentation recommends `args` whenever a path placeholder is used, because each element is passed without shell quoting. This also drops the previous dependency on Git and POSIX command substitution for root resolution.
- **2026-10-16 (unrelated fix, in scope because it was a failing check):** the Playwright `baseURL` used `127.0.0.1` while `next dev` serves `localhost`, so every run logged a Next.js cross-origin HMR warning. Switching the config to `localhost` removed it without loosening `allowedDevOrigins` in application config.

## Verification

Run 2026-10-16 from the repository root. Next.js commands under Node 24.16.0.

| Command | Result |
| --- | --- |
| `pnpm check:docs` | **pass** |
| `pnpm lint` | **pass** |
| `pnpm build` | **pass** |
| `pnpm typecheck` | **pass** |
| `pnpm test:e2e` | **pass** — 1 passed (chromium), no cross-origin warning after the `baseURL` fix |
| `python3 -m unittest discover -s scripts -p "test_harness.py"` | **pass** — 5 core tests, no adapter import |
| `python3 -m unittest discover -s scripts -p "test_claude_hooks.py"` | **pass** — 8 adapter tests |

Core-without-adapter and adapter-in-isolation evidence, plus live helper runs and broken fixtures, are recorded in the handoff report for this change.

**Live activation, observed 2026-10-16** in the first fresh session after the hook review prompt was accepted, from that session's transcript:

| Observation | Result |
| --- | --- |
| `SessionStart:startup` hook | exit 0, 309 ms; `additionalContext` delivered with both active-plan filenames |
| `Stop` hook | exit 0, 112 ms, output `{}` (documentation passing); `preventedContinuation: false` |
| `AGENTS.md` | loaded as the project instructions |
| `.claude/skills/*` symlinks | all three skills listed as available in the session |

There is still no CI, so no check runs against a committed revision.

## Handoff or outcome

Complete 2026-10-16. The core is tool-neutral; Claude Code is the only adapter, and its hooks, instructions, and skills were observed working in a live session. Follow-up hardening (pinned Node, forbidden instruction files, deny rules) continues in [2026-10-16-harness-hardening.md](../active/2026-10-16-harness-hardening.md).

Known gaps: no CI (TD-2); TD-9 and TD-10 remain as recorded. Nothing from this plan has been committed.

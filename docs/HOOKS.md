# Hooks

The harness is split deliberately:

- **Core** — plain Markdown and standalone commands. No agent tool, model, or hook is required to use it. `pnpm check:docs` and the Git hooks work in any shell, in CI, and for a human with no AI tooling at all.
- **Adapters** — small, optional, per-tool glue. The only one installed is for **Claude Code**. Nothing in the core imports or depends on it.

All hooks here are check-only. None formats, stages, commits, or rewrites source. The only state any of them changes is which Node version comes first on `PATH` — for a Git hook's own run, and for later Bash commands in a Claude Code session. None proves application behavior.

## Core: Git hooks

**Directory:** `.githooks/` — activated with `git config --local core.hooksPath .githooks`

| Hook | Runs | Rationale |
| --- | --- | --- |
| `pre-commit` | `pnpm check:docs`, `pnpm lint`, and `pnpm typecheck` **only when `.next/types/` exists** | Fast enough for every commit. `tsc` needs Next.js-generated route types, so on a never-built tree the hook prints a skip notice instead of failing — see TD-8. |
| `pre-push` | `pnpm verify` | Full verification before work leaves the machine. It runs the database-backed tests, so it needs the network and the dev branch credentials ([VERIFICATION.md](VERIFICATION.md)) |

Both use `#!/bin/sh` with `set -eu`, change to the Git root, and propagate failures. `pre-push` reads Git's ref-update lines from stdin and skips when no update carries content (a branch deletion, or empty stdin).

Both then put the Node version pinned in `.nvmrc` first on `PATH`, using `scripts/pinned_node.py` — standard library only; it looks under `$NVM_DIR/versions/node` (default `~/.nvm`) and accepts an exact version or a numeric prefix such as `24`. When nvm or that version is absent, `PATH` is left alone and `engine-strict=true` in `.npmrc` stops the first `pnpm` command with `ERR_PNPM_UNSUPPORTED_ENGINE`. This is what lets the hooks pass from a shell whose default is Node 18 (TD-7) without changing the global nvm default.

### Activation

`core.hooksPath` was unset before setup, so activating it replaced nothing. Only local configuration is touched; global Git config is not modified. To deactivate:

```sh
git config --local --get core.hooksPath          # confirm it still reads .githooks
git config --local --unset core.hooksPath
```

Bypass a single run with `git commit --no-verify` / `git push --no-verify` — and say so in the handoff when you do.

### What Git hooks do not prove

They inspect the **working tree**, not the snapshot being committed or pushed. A clean `pre-commit` run says nothing about whether a partially staged commit builds. There is no CI, so no check currently runs against the actual committed revision — see [VERIFICATION.md](VERIFICATION.md) and TD-2.

## Adapter: Claude Code

**Config:** `.claude/settings.json` — **Helper:** `scripts/claude_hooks.py` (Python 3, standard library only)

Schema verified 2026-10-16 against [the Claude Code hooks reference](https://code.claude.com/docs/en/hooks) and Claude Code 2.1.302.

| Event | Behavior | Bound |
| --- | --- | --- |
| `SessionStart` | Emits the entry-point path and up to twenty active-plan **filenames** as `hookSpecificOutput.additionalContext`. Does not read plan bodies, transcripts, or secrets. Claude Code caps that field at 10,000 characters. Also appends one `export PATH=…` line to `$CLAUDE_ENV_FILE`, which Claude Code runs before every Bash command, so the session uses the `.nvmrc` Node (via `scripts/pinned_node.py`). Skipped silently when the variable or the version is absent; never written twice to the same file. | 15s |
| `Stop` | Runs `scripts/check_harness.py`. On failure it returns top-level `{"decision":"block","reason":…}` so the documentation can be repaired; on a second failure in the same session, or in plan mode, it only warns via `systemMessage`. | 10s subprocess inside a 15s hook timeout |

Both entries use exec form — `"command": "python3"` with `"args": ["${CLAUDE_PROJECT_DIR}/scripts/claude_hooks.py"]` — which the documentation recommends whenever a path placeholder is involved, because each argument is passed without shell quoting. Unlike the previous Git-based invocation, this works in a non-Git copy of the tree and tolerates spaces in the path.

### The Stop loop bound

Claude Code's documented Stop payload does **not** include `stop_hook_active`, so the one-block budget cannot rely on it. `scripts/claude_hooks.py` therefore records a marker file in the system temp directory, keyed by a hash of the repository root and `session_id`, and blocks at most once per session. The marker expires after an hour and is deleted as soon as the documentation check passes. `stop_hook_active` is still honored when a host does send it. Marker read and write errors are swallowed — a failing temp directory degrades to "block once per Stop", never to a crash.

### Permission deny rules

`.claude/settings.json` also denies Claude Code edits to `/.next/**`, `/node_modules/**`, `/next-env.d.ts`, and the three files that would replace `AGENTS.md` as its instructions: `/CLAUDE.md`, `/.claude/CLAUDE.md`, `/CLAUDE.local.md`. Per [the permissions reference](https://code.claude.com/docs/en/permissions):

- `Edit(...)` rules cover every built-in file-editing tool. A `Write(...)` rule would be accepted but never consulted.
- A single leading `/` anchors at the session's primary working directory, so these assume a session started at the repository root.
- Deny rules apply in every permission mode, to Bash file commands Claude Code recognizes, and to redirection targets — but **not** to a script that opens files itself, such as a Python or Node process. This is a guardrail, not a sandbox. `pnpm check:docs` remains the tool-neutral check for the instruction files.

### Activation and trust — observed 2026-10-16

Claude Code asks you to review hooks from project settings before running them. That review was accepted, and both hooks were then observed in a fresh session's transcript: `SessionStart:startup` exited 0 in 309 ms and delivered its `additionalContext`; `Stop` exited 0 in 112 ms with `{}`. In the same session the deny rules were observed refusing a Write into `.next/`, a shell redirect into `.next/`, and a Write of `CLAUDE.md`.

Per [the settings reference](https://code.claude.com/docs/en/settings), Claude Code reloads edits to `permissions` and `hooks` in a running session. `SessionStart` still fires only when a session starts, resumes, clears, or compacts, so the `CLAUDE_ENV_FILE` Node pin — added after that session began — is **not yet observed**. In the next session, `node -v` should report the `.nvmrc` version and the startup context should end with "Bash commands use the Node pinned in .nvmrc".

Hook entries merge across user, project, and local settings rather than replacing each other, so check `~/.claude/settings.json` and `.claude/settings.local.json` before adding another source — two sources defining the same event both run.

### Disabling

Remove the specific entry from `.claude/settings.json`, or decline it at the review prompt. Do not disable by deleting `scripts/check_harness.py` — `pnpm check:docs` and the Git hooks depend on it, and the core must keep working with no adapter present.

## Other tools

No other agent tool is configured. A Codex adapter (`.codex/hooks.json` and `scripts/codex_hooks.py`) existed earlier in this repository and was removed on 2026-10-16 when Claude Code became the selected target. Any future adapter belongs beside this one: a small config plus a helper in `scripts/`, with the canonical documents and `pnpm` commands shared, not duplicated.

A tool with no hook support loses nothing from the core. Run the commands in [VERIFICATION.md](VERIFICATION.md) directly.

## Testing the helpers

```sh
python3 -m unittest discover -s scripts -p "test_harness.py"       # core, includes pinned_node
python3 -m unittest discover -s scripts -p "test_claude_hooks.py"
python3 scripts/pinned_node.py                                     # pinned bin dir, or exit 1
echo '{"hook_event_name":"SessionStart"}'                        | python3 scripts/claude_hooks.py
echo '{"hook_event_name":"Stop","session_id":"demo"}'            | python3 scripts/claude_hooks.py
echo 'not json'                                                  | python3 scripts/claude_hooks.py
```

Run these after any edit to `scripts/*.py` or `scripts/harness.json`. The unit tests use temporary fixtures and establish **helper behavior only** — they do not establish that a live Claude Code session loaded, trusted, or executed the hook. Those are separate observations; report them separately.

# Project harness setup

Status: Active
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-16

## Goal and acceptance criteria

Give this repository an agent-usable engineering harness: a concise entry point, canonical product/architecture/design/verification/plans/hooks documents, an execution-plan workflow, three starter skills, a dependency-light documentation checker, and mechanical feedback through Codex and Git hooks.

Acceptance:

- [x] `AGENTS.md` maps every canonical document, stays within its 100-line limit, and preserves the generated `nextjs-agent-rules` block.
- [x] Every path in `scripts/harness.json` exists and every local Markdown link resolves — `pnpm check:docs` passes.
- [x] `pnpm lint`, `pnpm build`, and `pnpm typecheck` pass under Node 24.16.0.
- [x] `python3 -m unittest discover -s scripts -p test_harness.py` passes (9 tests at the time; the suite was later split into 5 core and 8 adapter tests).
- [x] `pnpm test:e2e` passes — browsers finished downloading; 1 passed (chromium).
- [x] Codex hook helper returns valid JSON for SessionStart, Stop success, Stop failure, Stop continuation, plan mode, unknown event, and malformed input.
- [x] Git hooks are executable, resolve the repo root, and fail on a failing check.
- [x] ~~Codex hook trust confirmed in the host via `/hooks`~~ — **superseded 2026-10-16.** Codex is no longer a target; the integration was removed and replaced by a Claude Code adapter. Tracked in [2026-10-16-claude-code-harness-adaptation.md](../completed/2026-10-16-claude-code-harness-adaptation.md).
- [ ] Product (P1–P7), architecture (T1–T5), and design (D1–D6) questions answered, so the Draft documents can become real.

Non-goals: implementing any product feature, choosing a backend, adding CI, deploying, or committing this work.

## Context

Baseline before setup: `create-next-app` output at commit `5a0e0b7`, clean tree, one commit. Next.js 16.4.2 / React 19.3 / Tailwind v4 / TypeScript strict / pnpm 10.27.0. No tests, no CI, no `.codex/`, no `.agents/`, no custom `core.hooksPath`. `AGENTS.md` contained only the Next.js generated block. Python 3.13.6 available.

Owner decisions, 2026-10-16:

1. **Product undefined** — scaffold the harness, keep [../../PRODUCT.md](../../PRODUCT.md) a Draft with explicit unknowns.
2. **Backend undecided** — record persistence/auth/deployment as open in [../../../ARCHITECTURE.md](../../../ARCHITECTURE.md).
3. **Playwright** for end-to-end verification.
4. **Agents may update** Product, Architecture, and Design freely; no owner approval gate.

## Steps and progress

- [x] Inspect the repository and resolve the four consequential decisions with the owner.
- [x] Write the entry point and canonical documents from repository evidence, marking unknowns.
- [x] Seed `.agents/skills/` with the three starters, adapted to this project's real commands and paths.
- [x] Install the harness checker and hook helpers into `scripts/`; adapt the manifest.
- [x] Add Playwright (`@playwright/test` 1.64.1), `playwright.config.ts`, and a smoke spec; add `typecheck`, `check:docs`, `test:e2e`, `verify` scripts.
- [x] Prepare `.codex/hooks.json` and `.githooks/{pre-commit,pre-push}`; activate `core.hooksPath`.
- [x] Verify everything reachable and record actual output below.
- [x] Finish the Playwright browser download and run `pnpm test:e2e` once.
- [ ] Owner: answer the open product/architecture/design questions. (Hook activation moved to the adaptation plan.)

## Decisions and discoveries

- **2026-10-16 — `AGENTS.md` keeps the generated block.** `next dev` rewrites `nextjs-agent-rules` from `node_modules/next/dist/server/lib/generate-agent-files.js`. Deleting it produces a recurring dirty tree, so project content was appended below it instead.
- **2026-10-16 — Python retained for the checker.** Python 3.13.6 is present, and the bundled checker has no dependencies. It is exposed through `pnpm check:docs` so the project keeps a single command surface.
- **2026-10-16 — no dummy `test` script.** There is no unit test runner, so none is implied. The gap is recorded as TD-1 rather than hidden behind a passing no-op.
- **2026-10-16 — `core.hooksPath` was unset**, so activating `.githooks` replaced no existing hook manager. Only local Git config was touched.
- **2026-10-16 — the environment, not the harness, was the main obstacle.** Three real defects surfaced while verifying, all pre-existing:
  1. The shell's default Node is **18.17.1**; Next.js 16 requires `>=20.9.0` and refuses to start. Added `.nvmrc` (24.16.0) and `engines.node`, and documented it. Recorded as TD-7.
  2. Because the initial `pnpm install` ran under Node 18, the Tailwind oxide native binary was never fetched, and `pnpm build` failed with `Cannot find module './tailwindcss-oxide.darwin-universal.node'`. Re-running `pnpm install` under Node 24 added `@tailwindcss/oxide-darwin-arm64` and fixed it.
  3. `pnpm typecheck` fails on a never-built tree with `TS2304: Cannot find name 'LayoutProps'` — that type is generated into `.next/types/` by a build. `verify` was reordered to `build` before `typecheck`, and `pre-commit` skips `typecheck` when `.next/types/` is absent. Recorded as TD-8.
- **2026-10-16 — `pnpm test:e2e` needs two Playwright downloads**, `chromium` *and* `chromium-headless-shell`; installing only the former fails with a misleading "Executable doesn't exist" error. Documented in the README and VERIFICATION.
- **2026-10-16 — the checker found a real bug in its own first run:** `docs/changes/README.md` linked `../ARCHITECTURE.md` instead of `../../ARCHITECTURE.md`. Fixed. This is the clearest evidence the check is load-bearing rather than decorative.
- **Discovery (proposal, unreviewed):** `globals.css` overrides the Geist font variables with Arial. Recorded as TD-3 rather than fixed here, because it is a design decision and outside setup scope.

## Verification

Run 2026-10-16 from the repository root. Next.js commands were run with Node **24.16.0** (`nvm`), not the shell default.

| Command | Result |
| --- | --- |
| `pnpm check:docs` | **pass** — "Harness documentation checks passed." (failed on first run; see Decisions) |
| `pnpm lint` | **pass** — no output |
| `pnpm build` | **pass** — compiled in 602ms, 2 static routes (`/`, `/_not-found`) |
| `pnpm typecheck` | **pass** — after `pnpm build` generated `.next/types/` |
| `python3 -m unittest discover -s scripts -p test_harness.py` | **pass** — 9 tests, OK |
| `pnpm test:e2e` | **pass** (2026-10-16, after this plan's first handoff) — 1 passed, chromium |

Checker behavior against deliberately broken fixtures, each restored afterward:

| Fixture | Result |
| --- | --- |
| Appended `[deliberately broken](./does-not-exist.md)` to `docs/README.md` | exit 1, `docs/README.md: broken local link: ./does-not-exist.md` |
| Removed `docs/HOOKS.md` | exit 1, reported the missing required path **and** the three documents linking to it |

`scripts/codex_hooks.py`, invoked from `/tmp` to confirm it resolves its own root:

| Input | Output |
| --- | --- |
| `{"hook_event_name":"SessionStart"}` | `hookSpecificOutput` with the entry point and `["2026-10-16-project-harness-setup.md"]` |
| `{"hook_event_name":"Stop"}`, docs passing | `{}` |
| `{"hook_event_name":"Stop"}`, docs broken | `{"decision":"block", ...}` with the failing path |
| `{"hook_event_name":"Stop","stop_hook_active":true}`, docs broken | `systemMessage` warning only — no second block |
| `{"hook_event_name":"Stop","permission_mode":"plan"}`, docs broken | `systemMessage` warning only |
| `{"hook_event_name":"PreToolUse"}` | `{}` |
| `not json` | `{"systemMessage":"Invalid hook input; no checks ran."}` |

Git hooks: `.githooks/pre-commit` run directly against the broken fixture exited non-zero with the failing path. `core.hooksPath` was unset beforehand and is now `.githooks`; global Git config was not touched.

**Outstanding.** There is no CI, so no check runs against a committed revision. The Codex trust item that stood here is superseded; see the adaptation plan.

The Codex adapter described in the tables above (`.codex/hooks.json`, `scripts/codex_hooks.py`) **no longer exists**. This section is kept as the record of what was verified at the time — completed work is history and does not describe the current tree. For current hook behavior read [../../HOOKS.md](../../HOOKS.md).

## Handoff or outcome

Next concrete action for the owner: answer P1–P4 in [../../PRODUCT.md](../../PRODUCT.md) so the Draft documents can be replaced with real content. Until then the harness is usable for mechanical work, and every product-dependent document is visibly marked Draft.

Nothing has been committed. One acceptance criterion remains open (the product/architecture/design questions), so this plan stays active. Tooling work continues in [2026-10-16-claude-code-harness-adaptation.md](../completed/2026-10-16-claude-code-harness-adaptation.md).

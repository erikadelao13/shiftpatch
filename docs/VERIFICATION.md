# Verification

What to run, what each command actually proves, and where coverage stops. Report real output. **An unexecuted check has not passed.**

## Prerequisites

- Run every command from the repository root.
- **Node.js >= 20.9.0** — enforced by `engines` in `package.json` and pinned in `.nvmrc` (24.16.0). Next.js 16 refuses to run on Node 18 with `You are using Node.js 18.17.1. For Next.js, Node.js version ">=20.9.0" is required.` `.npmrc` sets `engine-strict=true`, so every `pnpm` command under an older Node fails at once with `ERR_PNPM_UNSUPPORTED_ENGINE`. In an interactive shell, run `nvm use` first. The Git hooks and Claude Code sessions select the pinned version themselves when nvm has it installed — see [HOOKS.md](HOOKS.md).
- pnpm 10.27.0 (`corepack enable` honors the pinned `packageManager`).
- `pnpm install` **on the correct Node version**, before the first run and after any dependency change. Installing under the wrong Node version skips platform-specific optional dependencies, which surfaces later as `Cannot find module './tailwindcss-oxide.darwin-universal.node'` during `pnpm build`. The fix is to re-run `pnpm install` under Node 20+.
- Python 3.9+ on `PATH` as `python3`, for the harness documentation check. Verified locally with Python 3.13.6.
- Playwright browsers, installed once before `pnpm test:e2e`:

  ```sh
  pnpm exec playwright install chromium chromium-headless-shell
  ```

  `chromium` alone is not enough — Playwright launches the headless shell by default and fails with `Executable doesn't exist at .../chrome-headless-shell` if only the full browser is present.
- **`pnpm typecheck` requires a prior build.** `tsc --noEmit` resolves generated route types such as `LayoutProps<"/">` from `.next/types/`, which only exists after `pnpm build` or a `pnpm dev` session. On a never-built tree it fails with `TS2304: Cannot find name 'LayoutProps'`.

## Commands

| Command | What it actually proves |
| --- | --- |
| `pnpm check:docs` | Runs `python3 scripts/check_harness.py` (no agent tool required): the files and directories in `scripts/harness.json` exist, its `forbidden` paths (`CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`) do not, `AGENTS.md` is within its line limit, and local Markdown links resolve to real paths. Structure only — it says nothing about whether the prose is correct. |
| `pnpm lint` | ESLint flat config with `eslint-config-next` core-web-vitals and TypeScript rules. Catches rule violations, not behavior. |
| `pnpm typecheck` | `tsc --noEmit` under `strict`, across every `.ts`/`.tsx` in the project — including `playwright.config.ts` and `e2e/`, which `next build` does not necessarily reach. Requires `.next/types/` from a prior build. Proves nothing at runtime. |
| `pnpm build` | `next build`. Proves the production build compiles and pages can be prerendered. Slow; the usual source of errors that `typecheck` alone misses, particularly around server/client boundaries. |
| `pnpm test:e2e` | Playwright specs in `e2e/` against a dev server Playwright starts itself. Proves the app boots and the asserted UI is reachable in a real browser. |
| `pnpm verify` | `check:docs` → `lint` → `build` → `typecheck` → `test:e2e`, failing fast. `build` runs **before** `typecheck` deliberately, so the generated route types exist by the time `tsc` runs. |

Aggregates, for convenience:

```sh
pnpm check:docs && pnpm lint && pnpm typecheck   # fast loop (needs one prior build)
pnpm verify                                      # full, before handoff
```

## Which checks a change requires

| Change | Required |
| --- | --- |
| Markdown, plans, skills, `scripts/harness.json` | `pnpm check:docs` |
| `scripts/check_harness.py`, `scripts/pinned_node.py`, `scripts/harness.json` | `pnpm check:docs` and `python3 -m unittest discover -s scripts -p "test_harness.py"` |
| `scripts/claude_hooks.py` | the above plus `python3 -m unittest discover -s scripts -p "test_claude_hooks.py"` |
| TypeScript or TSX under `src/` | `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| Anything users can see or interact with | the above plus `pnpm test:e2e`, plus a manual look at the affected screen |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, lockfile, `.npmrc`, `.nvmrc` | `pnpm verify` in full |
| `.githooks/*` or `.claude/settings.json` | the hook tests in [HOOKS.md](HOOKS.md), plus `pnpm check:docs` |
| Before any handoff or commit of application code | `pnpm verify` |

## Manual and UI verification

Automated checks do not establish that a screen is usable. For UI work, run `pnpm dev`, open the affected route, and confirm the real states — loading, empty, error, and populated — at a narrow and a wide viewport, and with keyboard navigation only. A compiling build and a green Playwright assertion are not evidence that a layout is correct.

## Environment isolation and cleanup

- Playwright starts and stops its own dev server on port 3000 (`playwright.config.ts`). Locally it reuses an already-running `pnpm dev`, so stale code in that server will be what gets tested; restart it when in doubt.
- Playwright writes `test-results/` and `playwright-report/`; both are gitignored. Delete them freely.
- `.next/` is a build cache. If a build failure looks impossible, remove `.next/` and rebuild before investigating further.
- Never point tests at real credentials or shared data. There is no backend yet, so there is nothing to isolate — revisit this section when T1–T3 in [../ARCHITECTURE.md](../ARCHITECTURE.md) are resolved.

## Limitations — do not overclaim

- **There are no unit or integration tests.** The only behavioral coverage is the Playwright smoke spec in `e2e/`, which asserts that the page renders. Logic correctness is currently unverified. Tracked in [exec-plans/tech-debt-tracker.md](exec-plans/tech-debt-tracker.md).
- `pnpm check:docs` validates link *targets*, not anchors, not URL reachability, and not HTML or MDX links. It skips code spans and fenced blocks and does not follow symlinked directories.
- Git hooks inspect the working tree, not the exact staged or pushed snapshot. A clean `pre-commit` run does not prove a partially staged commit builds. `pre-commit` also *skips* `typecheck` when `.next/types/` is absent rather than failing — so a never-built tree gets less coverage than the message implies.
- **There is no CI.** Every check above runs only where someone runs it. Tracked as debt.
- The automatic Node pin covers nvm installs only. With another version manager, or with the pinned version not installed, the hooks keep the shell's `PATH` and `engine-strict` fails them loudly rather than letting them pass on the wrong Node.
- Hook feedback is documentation-only. It never establishes application behavior.
- Adapter unit tests establish **helper** behavior. They do not establish that Claude Code loaded, trusted, or executed the hook — that is a separate, currently unverified observation. See [HOOKS.md](HOOKS.md).
- Every command in this document runs without any agent tool installed. Nothing here requires Claude Code.

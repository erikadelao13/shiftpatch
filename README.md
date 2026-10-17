# shiftpatch

A [Next.js](https://nextjs.org) 16 application. **The product is not yet defined** — see [docs/PRODUCT.md](docs/PRODUCT.md).

Working on this repository with an AI agent? Start at [AGENTS.md](AGENTS.md).

## Prerequisites

- **Node.js >= 20.9.0.** Pinned in `.nvmrc`; run `nvm use` (or the equivalent) before anything else. Next.js 16 refuses to run on Node 18, and `.npmrc` sets `engine-strict=true` so `pnpm` refuses up front. The Git hooks and Claude Code sessions pick the pinned version up from nvm automatically.
- **pnpm 10.27.0** — `corepack enable` picks up the pinned `packageManager`.
- **Python 3.9+** as `python3`, for the documentation check.

```sh
nvm use
pnpm install
pnpm exec playwright install chromium chromium-headless-shell   # once, for pnpm test:e2e
```

An install under the wrong Node version used to skip platform-specific native dependencies silently and fail later during the build; `engine-strict` now stops it instead. If a build still reports a missing `*.node` module, re-run `pnpm install` under the pinned Node.

## Development

```sh
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Editing `src/app/page.tsx` hot-reloads.

## Checks

```sh
pnpm check:docs   # documentation structure and local links
pnpm lint         # ESLint
pnpm build        # production build (also generates the route types tsc needs)
pnpm typecheck    # tsc --noEmit; requires a prior build
pnpm test:e2e     # Playwright smoke test in a real browser
pnpm verify       # all of the above, in order, failing fast
```

[docs/VERIFICATION.md](docs/VERIFICATION.md) records what each command actually proves and where coverage stops.

Git hooks live in `.githooks/` and are enabled with `git config --local core.hooksPath .githooks`. See [docs/HOOKS.md](docs/HOOKS.md).

## Documentation

[docs/README.md](docs/README.md) is the index. Architecture lives in [ARCHITECTURE.md](ARCHITECTURE.md); known gaps are tracked in [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md).

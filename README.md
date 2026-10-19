# shiftpatch

A [Next.js](https://nextjs.org) 16 application where agencies post nursing shifts and nurses claim them. See [docs/PRODUCT.md](docs/PRODUCT.md). Sign-in is implemented; the shift features are not yet.

Working on this repository with an AI agent? Start at [AGENTS.md](AGENTS.md).

## Prerequisites

- **Node.js 24.x.** Pinned in `.nvmrc` and `engines`; run `nvm use` (or the equivalent) before anything else. Next.js 16 refuses to run on Node 18, and `.npmrc` sets `engine-strict=true` so `pnpm` refuses up front. The Git hooks and Claude Code sessions pick the pinned version up from nvm automatically.
- **pnpm 10.27.0** — `corepack enable` picks up the pinned `packageManager`.
- **Python 3.9+** as `python3`, for the documentation check.

```sh
nvm use
pnpm install
pnpm exec playwright install chromium chromium-headless-shell   # once, for pnpm test:e2e
```

The database is Neon Postgres, with a `production` and a `dev` branch. Two gitignored files hold their connection strings: `.env` for `production` and `.env.development` for `dev`. Development tools (`pnpm dev`, tests, Prisma, the seed) use `dev`; `next build` and `next start` read `.env`, which is production. [.env.example](.env.example) lists the keys, including `AUTH_JWT_SECRET`, which you add by hand with a different value per file (`openssl rand -base64 32`).

To pull the Neon variables, install the Neon CLI (`npm i -g neon`), run `neon login`, then `neon env pull`. The project link lives in the gitignored `.neon`, which pins `production`, so refresh `.env.development` from the `dev` branch explicitly. A fresh clone first needs `neon init` with the project's org and project IDs. [ARCHITECTURE.md](ARCHITECTURE.md) §12 lists the variables and which tool reads which file.

```sh
pnpm db:migrate   # prisma migrate dev, dev branch only
pnpm db:seed      # the spec's agencies and five accounts, dev branch only
```

Both refuse to run unless `NEON_BRANCH=dev`. Run `pnpm db:seed` once before `pnpm test` or `pnpm test:e2e`.

An install under the wrong Node version used to skip platform-specific native dependencies silently and fail later during the build; `engine-strict` now stops it instead. If a build still reports a missing `*.node` module, re-run `pnpm install` under the pinned Node.

## Development

```sh
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to `/login`. The seeded accounts (all use the password `Trial2026!`) are listed in [docs/ShiftPatch-Technical-Spec.md](docs/ShiftPatch-Technical-Spec.md).

## Checks

```sh
pnpm check:docs   # documentation structure and local links
pnpm lint         # ESLint
pnpm build        # production build (also generates the route types tsc needs)
pnpm typecheck    # tsc --noEmit; requires a prior build
pnpm test         # Vitest unit and integration tests (dev branch; needs network)
pnpm test:e2e     # Playwright in a real browser (starts pnpm dev; needs the dev branch)
pnpm verify       # all of the above, in order, failing fast
```

[docs/VERIFICATION.md](docs/VERIFICATION.md) records what each command actually proves and where coverage stops.

Git hooks live in `.githooks/` and are enabled with `git config --local core.hooksPath .githooks`. See [docs/HOOKS.md](docs/HOOKS.md).

## Documentation

[docs/README.md](docs/README.md) is the index. Architecture lives in [ARCHITECTURE.md](ARCHITECTURE.md); known gaps are tracked in [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md).

# shiftpatch

A [Next.js](https://nextjs.org) 16 application where staffing agencies post nursing shifts, nurses with a valid credential claim them, and an administrator sees coverage, the audit log and timesheets. [docs/PRODUCT.md](docs/PRODUCT.md) describes the scope; [docs/ShiftPatch-Technical-Spec.md](docs/ShiftPatch-Technical-Spec.md) holds the required API contracts and test IDs.

**Live app: <https://shiftpatch-tau.vercel.app>.** Every sample account uses the password `Trial2026!`:

| Role | Email | Notes |
| --- | --- | --- |
| Agency | `admin@sunrisehealth.example` | Sunrise Health Staffing (`agency-a`) |
| Agency | `admin@metrocare.example` | Metro Care Partners (`agency-b`) |
| Nurse | `maria.lopez@example.com` | Credential valid until 2027-01-01 |
| Nurse | `james.cook@example.com` | Credential expired on 2026-06-01, so his claims are rejected |
| Admin | `alex.kim@example.com` | Sees both agencies |

More than 10 failed sign-ins for one email within 15 minutes return `429` for that email until the window passes.

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
pnpm db:seed      # the spec's sample data, dev branch only
```

Both refuse to run unless `NEON_BRANCH=dev`. Run `pnpm db:seed` once before `pnpm test` or `pnpm test:e2e`.

An install under the wrong Node version used to skip platform-specific native dependencies silently and fail later during the build; `engine-strict` now stops it instead. If a build still reports a missing `*.node` module, re-run `pnpm install` under the pinned Node.

## Development

```sh
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to `/login`. Sign in with the sample accounts above.

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

## Continuous integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push to `main`, every pull request, and on demand, in three jobs:

- **Secret scan:** gitleaks over the full history of every ref. Any finding fails the run.
- **Checks:** `pnpm check:docs`, the Python harness tests, `pnpm lint`, `pnpm build` and `pnpm typecheck`. The job holds no secrets.
- **Tests:** `pnpm test` and `pnpm test:e2e` against the Neon `dev` branch, using the repository secrets `DEV_DATABASE_URL` and `DEV_DATABASE_URL_UNPOOLED`. Runs queue so two never share the branch at once. A failure uploads the Playwright report and traces.

CI applies no migrations. Run `pnpm db:migrate` on `dev` before pushing a schema change, or the Tests job fails.

## Deployment

Vercel's Git integration builds pushes to `main` and nothing else ([vercel.json](vercel.json)), and waits for the CI checks before releasing a production deployment. The Production environment holds only `DATABASE_URL` (the pooled `production` URL) and `AUTH_JWT_SECRET`, both stored as secrets.

Only <https://shiftpatch-tau.vercel.app> is public. The project's other Vercel URLs ask for a Vercel login, and `shiftpatch.vercel.app` belongs to an unrelated project.

The production database changes only on purpose, from a machine whose `.env` holds the `production` branch:

```sh
NODE_ENV=production pnpm exec prisma migrate status   # read-only: lists pending migrations
NODE_ENV=production pnpm db:deploy                    # applies them
pnpm db:seed:production                               # reloads the spec's sample data
```

`pnpm db:seed:production` refuses unless both `NODE_ENV` and `NEON_BRANCH` are `production`. It resets the sample accounts and their passwords, the three seeded shifts and their cancellations, and the two nurses' credentials and documents. Shifts posted later, their cancellations and the audit log are kept.

## Documentation

[docs/README.md](docs/README.md) is the index. Architecture lives in [ARCHITECTURE.md](ARCHITECTURE.md); known gaps are tracked in [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md).

# CI and Vercel deployment

Status: Active
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-18

## Goal and acceptance criteria

Owner request, 2026-10-18: "Help me create a CI: Type checks, lint, and your own tests all green. Keep secrets out of git history. Then help me with the deployment, I'd like to deploy to vercel."

Run the repository's own checks on every push to `main` and every pull request in GitHub Actions. Make leaking a secret into git history fail loudly. Deploy the app to Vercel from `main`, with the production database migrated and seeded deliberately. This resolves TD-2 and the CI half of TD-5, and implements ARCHITECTURE §11 "Planned commands" and §12.

Acceptance:

**CI**

- [ ] `.github/workflows/ci.yml` runs on push to `main`, on every pull request, and on `workflow_dispatch`. It has three jobs with stable display names: `Secret scan`, `Checks` and `Tests`.
- [ ] `Checks` runs these in order: `pnpm check:docs`; both Python suites (`python3 -m unittest discover -s scripts -p "test_*.py"`); `pnpm lint`; `pnpm build`; `pnpm typecheck`. The job holds no database secret.
- [ ] `Tests` runs `pnpm test` and `pnpm test:e2e` against the Neon `dev` branch. Its connection strings come from repository secrets. A job-level concurrency group queues runs so that no two ever overlap. When the job fails, it uploads the Playwright report and traces.
- [ ] The first run on GitHub is green on all three jobs for the pushed commit, at the same counts as the local baseline (217 Vitest, 110 Playwright) or the counts at that time. The run URL and the number of flaky (retried) tests are recorded under Verification.
  - No `continue-on-error`.
  - No skipped or disabled checks.
  - No new lint suppressions.
- [ ] Hardening:
  - Every action is pinned to a full commit SHA, with the version as a comment.
  - The workflow sets `permissions: contents: read`.
  - Checkout uses `persist-credentials: false`.
  - There is no `pull_request_target` trigger.
  - The runner is pinned to `ubuntu-24.04`.
- [ ] A clean export of the commit, with no `.env*` files present, passes `pnpm install --frozen-lockfile`, `pnpm build` and `pnpm typecheck` locally. This proves `Checks` needs no secrets.

**Secrets out of history**

- [ ] `Secret scan` downloads gitleaks v8.30.1, verifies it against the pinned SHA-256, and runs `gitleaks git --redact --verbose` over the full history of every ref (checkout `fetch-depth: 0`). Any finding fails the run.
- [ ] A local run of the same scan over today's history reports zero findings, or every finding is triaged:
  - A real secret stops this plan for rotation and history rewriting, with the owner deciding.
  - A false positive gets a narrowly scoped `.gitleaks.toml` entry with a stated reason. The default rules stay on (`[extend] useDefault = true`).
- [ ] The scan is shown to catch a planted fake credential. Run it against a throwaway scratch repository, never this one.
- [ ] GitHub secret scanning and push protection are enabled on the repository and confirmed through the API or the settings page.
- [ ] After the final commit, nothing secret has leaked:
  - The counts-only scan of history for the real local secret values (see Verification) still reports 0.
  - The first CI log and the first Vercel build log contain no secret value.

**Deployment**

- [ ] The production Neon branch is migrated with `NODE_ENV=production pnpm db:deploy`, after a read-only `prisma migrate status` and with the owner's go-ahead.
- [ ] The explicit production seed override exists. ARCHITECTURE §12: "`pnpm db:seed` refuses production, and the deployment plan adds the explicit override". It has unit tests and has been run once against production with the owner's go-ahead. The plain `pnpm db:seed` still refuses anything but `dev`.
- [ ] `vercel.json` deploys `main` only, using `{"git": {"deploymentEnabled": {"main": true, "**": false}}}`. Pushing the feature branch creates no Vercel deployment, and that observation is recorded.
- [ ] The Vercel project is linked to the GitHub repository (Git integration). Its Production environment holds only `DATABASE_URL` (the production pooled URL) and a fresh `AUTH_JWT_SECRET`, both of type Secret. Both are piped over stdin, so no value appears in a command, output or this repository.
- [ ] Vercel Deployment Checks require `Secret scan`, `Checks` and `Tests` before a production deployment is promoted. Whether this also holds back the default `<project>.vercel.app` alias, and not just custom domains, is observed and recorded.
- [ ] The public production URL passes a smoke check in a fresh, signed-out browser session, with no Vercel login:
  - `GET /api/health` returns `200 {"status":"ok"}`.
  - `POST /api/auth/login` returns a token for one account of each role.
  - Browser sign-in lands each role on its page.
  - `GET /api/credentials/document` with no token returns the `401` JSON, not a cached response.
- [ ] Any mutating smoke check runs only with the owner's go-ahead. These are a posted shift that persists across a reload, and the one deployed credential upload/download check that ARCHITECTURE §11 asks for.
- [ ] These documents describe what now exists:
  - VERIFICATION.md: the CI section, and "There is no CI" removed.
  - ARCHITECTURE.md §2, §11 and §12: the URL, deploy gating, the production seed command, and which variables Vercel holds.
  - README.md: CI and deploy. Also fix the stale "the shift features are not yet" line.
  - tech-debt-tracker.md: TD-2 deleted, TD-5 resolved or narrowed, and new gaps added.
  - decisions.md: agent defaults.
  - `scripts/harness.json`: `.github/workflows/ci.yml` added to `required`.
- [ ] `pnpm verify` passes locally on the final tree, and its output is recorded.

Non-goals, recorded so they aren't drifted into:

- Preview deployments and Neon preview branching.
- A throwaway Neon branch per CI run.
- A custom domain.
- GitHub branch-protection rules.
- Dependabot.
- A local gitleaks pre-commit hook.
- Fixing the build-time "Unhandled API error" log noise (see Discoveries).
- Component tests.
- Monitoring or alerting.

## Context

**Baseline (2026-10-18, `main` at `19a3359`, clean tree, pushed):**

- There is no `.github/`, `vercel.json` or `.vercel/`.
- `gh`, `vercel` and `gitleaks` are not installed.
- The GitHub repository `erikadelao13/shiftpatch` is **public** and owned by a personal account. The remote has only `main`.
- `.gitignore` covers `.env*` (except `.env.example`), `.neon`, `.vercel` and `*.pem`. Git history only ever added `.env.example`.

**Data and environment:**

- Neon is in `us-east-1` (`…c-13.us-east-1.aws.neon.tech`). That matches Vercel's default function region, `iad1`, so no region config is needed.
- The app reads only `DATABASE_URL` and `AUTH_JWT_SECRET` at runtime, both lazily, so `next build` needs no variables. `NEON_BRANCH` and `DATABASE_URL_UNPOOLED` are read only by the seed, the guards, the tests and `e2e/support.ts`.
- `next dev`, Vitest (`loadEnv`) and `e2e/support.ts` (`loadEnvConfig`) all let process environment variables override files. CI can therefore pass everything as job `env:` with no files.

**Affected paths:**

- New: `.github/workflows/ci.yml`, `vercel.json`, possibly `.gitleaks.toml`.
- Changed: `prisma/seed.ts`, `prisma/branch-guard.ts` (plus tests), `package.json` (`db:seed:production`, `engines`), `playwright.config.ts` (CI reporter), `scripts/harness.json`.
- Docs: listed in the acceptance criteria above.

**Verified reference facts (2026-10-18).** Each was checked against its source, and each pin was resolved with `git ls-remote`. Releases less than two weeks old were swapped for the previous patch.

| Item | Pin |
| --- | --- |
| `actions/checkout` | v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `pnpm/action-setup` | v6.1.0 `ea17c68df8912ef543352723c149a84f56e3d413` |
| `actions/setup-node` | v7.0.0 `820762786026740c76f36085b0efc47a31fe5020` (v7.1.0 is from 2026-10-08, too new) |
| `actions/cache` | v6.1.0 `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` |
| `actions/upload-artifact` | v7.0.1 `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (v7.0.2 is from 2026-10-07, too new; its `action.yml` is identical) |
| gitleaks | v8.30.1, `https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz`, sha256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`. The binary is at the archive root. For a local macOS run, take the `darwin_arm64` asset and check it against the same release's `gitleaks_8.30.1_checksums.txt`. |
| Vercel CLI | Use `pnpm dlx vercel@<version>`. Pick the newest release published at least 14 days ago (`npm view vercel time --json`). 64.5.0 is from 2026-10-16, too new. |
| Runner | `ubuntu-24.04`. `ubuntu-latest` starts moving to 26.04 on 2026-10-19 (runner-images issue #14748). |

**Gotchas found by the research:**

- **Step order is fixed.** Run checkout → `pnpm/action-setup` (no `version` input) → `setup-node` (`node-version-file: .nvmrc`, `cache: pnpm`) → `pnpm install --frozen-lockfile`.
  - `setup-node` with `cache: pnpm` calls `pnpm store path`, so it fails if pnpm isn't installed first.
  - `pnpm/action-setup` throws "Multiple versions of pnpm specified" for any `version` that isn't exactly `10.27.0`. It reads `packageManager` when `version` is omitted.
- **gitleaks flags:**
  - Don't pass `--log-opts`. It replaces the default `--all --full-history`.
  - Write `--redact`, never `--redact N`.
  - Exit code 1 means a leak *or* an error.
- **upload-artifact skips hidden files by default.** `playwright-report/` and `test-results/` aren't hidden.
- **Vercel branch matching:**
  - In `git.deploymentEnabled`, `"*"` does not match `feat/x`, so use `"**"`.
  - When rules overlap, a branch deploys if any rule matching it is `true`.
  - Branches that match no rule deploy by default.
- **Deployment Checks don't stop the build.** Vercel still builds, but holds the alias until the selected checks pass. "Force Promote" bypasses it. The check names come from the job names, so keep them stable.
- **Vercel Node version:**
  - Node 24.x is the default.
  - `engines.node: ">=20.9.0"` picks 24.x but warns that it will auto-upgrade with each new major.
  - `engines` overrides the dashboard setting.
- **pnpm on Vercel:**
  - Vercel honours `packageManager: pnpm@10.27.0`. The build log should confirm this.
  - The root `postinstall` (`prisma generate`) still runs. Prisma's v7 docs still recommend generating in `postinstall` on Vercel.
- **Vercel variable types:**
  - "Sensitive" variables are now called **Secret**.
  - `vercel env add NAME production` reads the value from stdin.
  - Confirm the flags with `--help` for the chosen CLI version.
  - Use `printf '%s'`, not `echo`, so no trailing newline is added.
- **Deployment Protection (Standard)** guards previews and per-deployment URLs. The production domain `<project>.vercel.app` stays public, as ARCHITECTURE §12 requires.
- **Pushing a file under `.github/workflows/` over HTTPS needs a credential with the `workflow` scope.** `gh auth login` followed by `gh auth setup-git` provides it.

## Steps and progress

Work on a branch, `chore/ci-and-deploy`, and commit by context (the `contextual-commits` skill). ⏸ marks a checkpoint: stop, say exactly what will happen, and wait for the owner's go-ahead.

**Phase A: CI and secret scanning**

- [x] Baseline: `pnpm verify` green, and the history value scan clean (see Verification).
- [x] Owner decisions recorded (see Decisions, and [../../decisions.md](../../decisions.md)).
- [x] Download gitleaks for macOS into the scratchpad and verify its checksum. Run `gitleaks git --redact --verbose` on this repository, then triage any findings, adding `.gitleaks.toml` only if needed. Prove detection on a scratch repository that has a planted fake key.
- [x] Write `.github/workflows/ci.yml`:
  - **Workflow concurrency:** `ci-${{ github.workflow }}-${{ github.ref }}`, with `cancel-in-progress` only for `pull_request` events.
  - **`Secret scan`:** `timeout-minutes: 5`, checkout with `fetch-depth: 0`, pinned gitleaks with `sha256sum -c`.
  - **`Checks`:** `timeout-minutes: 15`. The pnpm, Node and install steps, then cache `.next/cache` with `actions/cache`, keyed as in `node_modules/next/dist/docs/01-app/02-guides/ci-build-caching.md`. Then the five commands in order.
  - **`Tests`:** `timeout-minutes: 20`. Job concurrency `shiftpatch-neon-dev` with `cancel-in-progress: false`. Env:
    - `DATABASE_URL: ${{ secrets.DEV_DATABASE_URL }}`
    - `DATABASE_URL_UNPOOLED: ${{ secrets.DEV_DATABASE_URL_UNPOOLED }}`
    - `NEON_BRANCH: dev`
    - A per-run `AUTH_JWT_SECRET`, generated with `openssl rand -base64 32`, masked with `::add-mask::`, and written to `$GITHUB_ENV`.

    Then `pnpm exec playwright install --with-deps chromium chromium-headless-shell`, `pnpm test` and `pnpm test:e2e`. On `failure()`, upload `playwright-report/` and `test-results/` with `retention-days: 7`.
- [x] `playwright.config.ts`: in CI, use the reporters `[["github"], ["html", { open: "never" }]]` so a failure leaves a report to upload. Local behaviour is unchanged.
- [x] `scripts/harness.json`: add `.github/workflows/ci.yml` to `required`.
- [x] Local CI simulation: `git archive HEAD` into the scratchpad, which leaves out all `.env*` files. Then `pnpm install --frozen-lockfile`, `pnpm build` and `pnpm typecheck` there. Say what gets deleted before removing the scratch copy.
- [x] ⏸ Owner installs and authenticates `gh`: `brew install gh`, `! gh auth login`, `! gh auth setup-git`. Then set the two repository secrets from `.env.development` over stdin (`gh secret set DEV_DATABASE_URL --repo erikadelao13/shiftpatch`). Never print, echo or pass a value as an argument.
- [x] ⏸ Enable secret scanning and push protection: `gh api -X PATCH repos/erikadelao13/shiftpatch` with the `security_and_analysis` fields, or the owner does it on the settings page. Confirm with `gh api repos/erikadelao13/shiftpatch --jq .security_and_analysis`.
- [x] ⏸ Push the branch and open a pull request. The `pre-push` hook runs `pnpm verify`. Watch the PR's CI run until all three jobs finish, and record the run URL, the counts and any flaky tests.

**Phase B: Deployment**

- [ ] Production seed override (proposal, see Decisions). Add `pnpm db:seed:production`, which runs `NODE_ENV=production tsx prisma/seed.ts --production`.
  - Only with `--production`: load `.env` alone (`loadEnvConfig(cwd, false)`) and require `NODE_ENV=production` and `NEON_BRANCH=production`.
  - Without the flag, nothing changes.
  - Unit-test the guard. VERIFICATION requires `pnpm test` and `pnpm test:e2e` for `prisma/` changes.
- [ ] `vercel.json` with `git.deploymentEnabled`. `package.json` `engines.node` set to `"24.x"` (proposal, see Decisions), with the README and VERIFICATION prerequisites updated to match.
- [ ] ⏸ Production database:
  1. Read-only `NODE_ENV=production pnpm exec prisma migrate status`. Report the output.
  2. `NODE_ENV=production pnpm db:deploy`.
  3. `pnpm db:seed:production`.

  Before running, say that re-running the seed later resets the three fixture shifts, their cancellations, the fixture nurses' documents and the fixture passwords on production.
- [ ] ⏸ Owner logs in with `! pnpm dlx vercel@<version> login`. Then:
  1. Create and link the project (`vercel link`; `.vercel/` is gitignored).
  2. Add the Production variables over stdin:
     - `DATABASE_URL` from `.env`.
     - `AUTH_JWT_SECRET` from `openssl rand -base64 32` piped straight in. It never touches disk.
  3. Connect the Git repository (`vercel git connect`, or Settings → Git if the CLI needs the browser).

  **Never run `vercel deploy` from the local working tree.** It could upload the gitignored `.env` files. Deploy only through Git.
- [ ] ⏸ Owner, in the dashboard:
  - Settings → Environments → Production: automatic aliasing on.
  - Settings → Build and Deployment → Deployment Checks → Add Checks → GitHub: require `Secret scan`, `Checks` and `Tests`.
- [ ] Confirm the pushed feature branch produced no Vercel deployment.
- [ ] ⏸ Merge the pull request into `main`, using the method the owner chooses. Watch:
  1. CI on `main`.
  2. The Vercel build. Check its log for the pnpm version, the Node version, `prisma generate` and any secret values.
  3. The promotion waiting for checks.
- [ ] Smoke-test the public URL as listed in the acceptance criteria. ⏸ before any mutating check.
- [ ] Update the documents, run `pnpm verify`, record the outcome, and move this plan to `completed/` only when every box above is ticked.

## Decisions and discoveries

**Owner decisions, 2026-10-18** (asked while planning):

- **CI tests use the shared Neon `dev` branch**, not a throwaway branch per run.
  - CI test jobs are serialized among themselves.
  - A CI run at the same moment as a local `pnpm verify` can still collide on the seeded fixtures. This is accepted and gets a new tech-debt entry.
  - Rejected alternative: a branch per run. It would need a broad `NEON_API_KEY` secret and changes to the `NEON_BRANCH` guard.
- **Vercel Git integration deploys `main` only.**
  - There are no preview deployments, so only `main` reaches a database through Vercel.
  - Deployment Checks hold production promotion until CI passes.
  - Rejected alternatives: Neon preview branches, which conflict with the `migrate deploy` guard, and deploying from GitHub Actions, which needs an account-wide `VERCEL_TOKEN`.
- **Secrets are piped through `gh` and the Vercel CLI from the local env files over stdin.** They never appear in commands, output, the chat or the repository. The production `AUTH_JWT_SECRET` is freshly generated straight into Vercel.
- **Execution happens in a fresh session** from the handoff prompt.

**Agent proposals, not yet reviewed by the owner.** Adopt them unless the owner objects; each is recorded in decisions.md when implemented.

- **Only two GitHub secrets: `DEV_DATABASE_URL` and `DEV_DATABASE_URL_UNPOOLED`.**
  - The `DEV_` prefix makes it obvious which branch they belong to.
  - `NEON_BRANCH: dev` is a literal in the workflow. As VERIFICATION says, the guard is only as good as that label.
  - `AUTH_JWT_SECRET` is generated per run, because every token in a run is signed and verified inside that run.
- **Vercel holds only `DATABASE_URL` and `AUTH_JWT_SECRET`, in Production only.** `DATABASE_URL_UNPOOLED` and `NEON_BRANCH` aren't read at runtime.
- **`engines.node` becomes `"24.x"`.** This matches `.nvmrc`, makes Vercel deterministic and removes the auto-upgrade warning. Locally, with `engine-strict`, it also stops a non-24 Node, which is stricter than today's `>=20.9.0`.
- **Production seeding is a separate script with an explicit flag**, rather than an environment variable that loosens `assertDevBranch`. The plain `db:seed` and the test guard stay untouched.
- **gitleaks runs as a checksum-verified binary**, not through `gitleaks/gitleaks-action`. The action's latest v2 tag still declares `node20` and comes under a commercial licence, while the binary needs neither.

**Discoveries:**

- **2026-10-18, build-log noise.** `pnpm build` prints "Unhandled API error: Route /api/credentials/document needs to bail out of prerendering … used request.headers" twice.
  - `errorResponse` (`src/shared/server/errors.ts:35`) catches and logs Next's internal prerender bail-out.
  - The route table still marks the route `ƒ (Dynamic)`, so behaviour is correct. The deployed `401` smoke check confirms it.
  - Proposal for a follow-up, out of scope here: re-throw Next's internal errors first (check the bundled docs for `unstable_rethrow`). Record it as tech debt.
- **2026-10-18, stale README.** It still says "Sign-in is implemented; the shift features are not yet."
- **2026-10-18, fork PRs.** Pull requests from forks get no secrets, so `Tests` will fail on them. That's acceptable for a single-owner repository; document it.
- **2026-10-18, concurrency queue limit.** GitHub keeps one running and one pending job per concurrency group. A third run cancels the older pending one, which shows as cancelled, not failed.

## Verification

Baseline, run 2026-10-18 at `19a3359`, Node 24.16.0, pnpm 10.27.0, reusing the `next dev` already on port 3000 (started after HEAD, clean tree):

| Command | Result |
| --- | --- |
| `pnpm verify` | **exit 0 in 110 s**. "Harness documentation checks passed."; lint clean; build compiled (20 routes, the two log lines in Discoveries); typecheck clean; Vitest "Test Files 23 passed (23) / Tests 217 passed (217)"; Playwright "110 passed (1.1m)" |
| Counts-only scan of `git log --all -p --full-history` (86 commits) for each real value in `.env` and `.env.development` (both URLs, their passwords, both `AUTH_JWT_SECRET`s), plus patterns for a password-bearing Postgres URL, `npg_`, `AUTH_JWT_SECRET=<value>`, private-key blocks, and GitHub or Vercel token shapes | **0 occurrences** for every value and pattern |
| `git ls-files` for env, key and secret-like paths | only `.env.example` |

Phase A, local, 2026-10-18 on branch `chore/ci-and-deploy`:

| Check | Result |
| --- | --- |
| gitleaks 8.30.1 darwin_arm64 | checksum OK against `gitleaks_8.30.1_checksums.txt` |
| `gitleaks git --redact --verbose` over this repo | "80 commits scanned", "no leaks found", exit 0 (86 commits by `rev-list --all`; gitleaks skips merge commits that carry no diff) |
| Same scan on a scratch repo with a planted fake key | `github-pat` finding, "leaks found: 1" (the AWS docs example key was allowlisted by default rules) |
| Workflow YAML | parses; job names `Secret scan`, `Checks`, `Tests` |
| Clean export of tracked files (only `.env.example` present): `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck` | all passed |
| `pnpm check:docs`, `pnpm lint`, `tsc --noEmit` | passed |

Phase A, GitHub, 2026-10-18:

| Check | Result |
| --- | --- |
| `gh` 2.102.0, token scopes `gist`, `read:org`, `repo`, `workflow`; secrets `DEV_DATABASE_URL` and `DEV_DATABASE_URL_UNPOOLED` set by the owner over stdin | `gh secret list` shows both |
| Secret scanning and push protection | `gh api repos/erikadelao13/shiftpatch --jq .security_and_analysis` shows both `enabled` |
| `git push` of `chore/ci-and-deploy` | `pre-push` ran `pnpm verify`; "110 passed (1.2m)"; pushed |
| First CI run on PR #1, https://github.com/erikadelao13/shiftpatch/actions/runs/39178690222 | `Secret scan` pass (6 s), `Checks` pass (1m23s), `Tests` pass (2m19s). Vitest 23 files, 217 passed; Playwright 110 passed. No flaky tests reported. |

Outstanding: Phase A acceptance items still to confirm (secret scan of the first CI log, final history re-scan), and all of Phase B.

## Handoff or outcome

**Next action:** Phase B, first step: the production seed override (`pnpm db:seed:production`) with unit tests, on `chore/ci-and-deploy` (PR #1 is open and green; do not merge yet). Then `vercel.json` and `engines.node`.

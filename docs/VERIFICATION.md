# Verification

What to run, what each command actually proves, and where coverage stops. Report real output. **An unexecuted check has not passed.**

## Prerequisites

- Run every command from the repository root.
- **Node.js >= 20.9.0** — enforced by `engines` in `package.json` and pinned in `.nvmrc` (24.16.0). Next.js 16 refuses to run on Node 18 with `You are using Node.js 18.17.1. For Next.js, Node.js version ">=20.9.0" is required.` `.npmrc` sets `engine-strict=true`, so every `pnpm` command under an older Node fails at once with `ERR_PNPM_UNSUPPORTED_ENGINE`. In an interactive shell, run `nvm use` first. The Git hooks and Claude Code sessions select the pinned version themselves when nvm has it installed — see [HOOKS.md](HOOKS.md).
- pnpm 10.27.0 (`corepack enable` honors the pinned `packageManager`).
- `pnpm install` **on the correct Node version**, before the first run and after any dependency change. Installing under the wrong Node version skips platform-specific optional dependencies, which surfaces later as `Cannot find module './tailwindcss-oxide.darwin-universal.node'` during `pnpm build`. The fix is to re-run `pnpm install` under Node 20+.
- Python 3.9+ on `PATH` as `python3`, for the harness documentation check. Verified locally with Python 3.13.6.
- **Network and the Neon `dev` branch, for `pnpm test`, `pnpm test:e2e` and `pnpm verify`.** `.env.development` must hold `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH=dev` and `AUTH_JWT_SECRET`, the branch must be migrated (`pnpm db:migrate`) and seeded (`pnpm db:seed`), and port 5432 must be reachable. Without them the integration tests fail in `beforeAll` and the e2e specs fail at sign-in. The `pre-push` hook runs `pnpm verify`, so a push needs them too.
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
| `pnpm test` | Vitest: unit tests beside the code, and `tests/integration/` against the Neon `dev` branch. Proves password hashing, token checks, the request guard, the login throttle and session revocation, plus shift validation, the serializer's nine keys, the permission policy and credential expiry rules, `tests/integration/shifts.test.ts` (listing, agency scoping, posting) and `tests/integration/claims.test.ts` (claiming) `tests/integration/cancellations.test.ts` (cancelling) and `tests/integration/credentials.test.ts` (saving a credential) on throwaway agencies and nurses, with the seed check and `expectHttpError` shared in `tests/integration/support.ts`. The claim tests cover the expiry boundary with an injected "today", every error status, the audit row, and two concurrent claims on five fresh shifts, each giving one winner and one `409` against the real database. `shifts.test.ts` fails in `beforeAll` unless the three seeded shifts are in their spec state, and `claims.test.ts` and `cancellations.test.ts` also need the two seeded credentials. The cancel tests cover both reasons for an agency, the admin and the claiming nurse, every refusal in its documented order with nothing written, claim-cancel-claim-cancel keeping two `Cancellation` rows, and an agency no-show racing the nurse's own cancel on five fresh shifts, each giving one winner, one `409`, one `Cancellation` row and one `shift_cancelled` event. The credential tests cover a first save and a replacement (one `Credential`, one `CredentialDocument`, a new `uploadedAt`), the chained audit rows, an expired nurse claiming after a save, the refusals for an agency and the admin, today accepted and yesterday rejected with an injected "today", HTML sent as a PDF, the detected type winning over the declared one, byte-identical download, and five rounds of two concurrent first saves for one nurse, each giving two `200`s, one `Credential`, one `CredentialDocument` and two chained audit rows. `tests/integration/audit.test.ts` posts, claims, cancels and saves through the real services and checks `listAuditEntries` returns those four events as parsed entries, then inserts 51 rows and checks the newest 50 come back with the full total, and `shifts.test.ts` checks that a post writes one `shift_posted` row and a refused post writes none. Unit tests cover the timesheet hour formatting and totals, the audit event labels and details, the audit presenter's metadata mapping and malformed-metadata errors, the file signatures, `cleanFileName`, `contentDisposition`, `assertContentLength` and `readFormData`. `assertSeededState` also fails when a fixture nurse has a document. `tests/setup.ts` fails the run unless `NEON_BRANCH=dev`. |
| `pnpm test:e2e` | Playwright specs in `e2e/` against a dev server Playwright starts itself, on the `dev` branch. Proves the login API contract, the browser sign-in flow, redirects and sign-out in a real browser, the exact status codes and bodies of the three shift routes (`e2e/shifts-api.spec.ts`), the claim route (`e2e/claim-api.spec.ts`: Maria's `200`, James's exact `403`, `401`, `403`, `404`, `409` and two parallel claims), the agency board and posting flow (`e2e/agency-ui.spec.ts`), the nurse marketplace (`e2e/nurse-ui.spec.ts`: claiming, James's rejection, a lost race and the disabled buttons), the cancel route (`e2e/cancel-api.spec.ts`: the ten-key `200`, every status, a malformed body and reclaiming a reopened shift), both cancel dialogs (the reason choice, banners, the locked pending state and the failure refresh in `agency-ui.spec.ts` and `nurse-ui.spec.ts`), and the admin shift overview (`e2e/admin-ui.spec.ts`: seeded rows and badges, totals agreeing, the agency filter, arrow-key tabs, Refresh after a post and a claim, and refresh on tab return), the audit log page (`e2e/admin-ui.spec.ts`: sidebar navigation and `aria-current`, one `audit-log-table`, a posted, claimed and no-show shift appearing as "Shift posted", "Shift claimed" and "No-show reported", a nurse redirected away, and no page-wide horizontal scroll at 375px), and the credentials page (`e2e/credentials-ui.spec.ts`: sidebar navigation, Maria's valid and James's expired record, file and date validation that sends nothing, a failed save, mocked with `page.route`, that keeps the input, a past date rejected before sending, and a real save by a throwaway expired nurse: banner, card, byte-identical download, a claim on the marketplace and no stale success banner on return), the nurse timesheet (`e2e/timesheets-ui.spec.ts`: sidebar navigation and `aria-current`, Maria's seeded LPN row with 12 scheduled hours and "Not recorded", a throwaway nurse's empty state with zero totals, Refresh picking up an overnight claim with its cards and footer total, and no page-wide horizontal scroll at 375px), and the credential routes (`e2e/credentials-api.spec.ts`: `401`, `403`, `413`, every `400`, the exact `200` keys, the download headers and bytes, and `404` before any upload). Every credential spec uses a throwaway nurse (`createNurse` in `e2e/support.ts`), never Maria or James. After a run the dev branch should hold exactly 3 `Shift`, 2 `Credential`, 0 `CredentialDocument`, 0 `AuditEvent` and 0 `Cancellation` rows, the seeded ones. |
| `pnpm db:migrate`, `pnpm db:seed` | Apply migrations and load the spec fixtures. Both refuse unless `NEON_BRANCH=dev`. |
| `pnpm verify` | `check:docs` → `lint` → `build` → `typecheck` → `test` → `test:e2e`, failing fast. `build` runs **before** `typecheck` deliberately, so the generated route types exist by the time `tsc` runs. |

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
| `prisma/`, `prisma.config.ts`, `src/shared/server/`, `src/features/*/server/`, `src/proxy.ts`, `src/app/api/` | the above plus `pnpm test` and `pnpm test:e2e` |
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
- Never point tests at production credentials or the evaluator's shared data. Two gitignored files hold the two Neon branches:
  - `.env` is the **`production`** branch (`NEON_BRANCH=production`).
  - `.env.development` is the **`dev`** branch (`NEON_BRANCH=dev`).
- Which command reads which file ([../ARCHITECTURE.md](../ARCHITECTURE.md) §12 has the full table):
  - `pnpm dev`, Playwright, `pnpm test`, the Prisma CLI and `pnpm db:seed` read `.env.development` over `.env`, so they use `dev`.
  - `pnpm build` and `pnpm start` read `.env`, so they use **production**. `next build` runs no queries, so a build is safe; a running `pnpm start` is not a test target.
  - Vitest loads `.env.development` explicitly in `vitest.config.mts`. Its own `NODE_ENV=test` would otherwise read only `.env`.
- Guards: `NEON_BRANCH` must be `dev` for the seed, `prisma migrate dev`, `migrate reset`, `db push`, and every Vitest run. `prisma migrate deploy` refuses unless `NODE_ENV=production`. The guard is only as good as the label in the file: a `.env.development` that points at production but says `dev` defeats it.
- Tests never reset or truncate the database. Each creates rows with unique IDs and deletes only those (`tests/integration/`, `e2e/support.ts`). After a run the dev branch should hold only the seeded rows: 5 `User`, 2 `Agency`, 3 `Shift`, 2 `Credential`, no `CredentialDocument`, `AuditEvent`, `Cancellation`, `ApiSession` or `LoginAttempt` rows.
- Playwright reuses any server already on port 3000. A `pnpm start` there would point the e2e tests at **production**, so only `pnpm dev` may hold that port during an e2e run. A `pnpm dev` started before `prisma generate` or a migration keeps the old Prisma client and answers new routes with `500`; restart it after changing the schema, and after deleting or moving a route directory, which leaves a long-running dev server answering 404 for the new route.
- Manual database check: `curl -i http://localhost:3000/api/health` against a running `pnpm dev` (the `dev` branch). Running it against `pnpm build && pnpm start` instead checks the **production** branch with a harmless `select 1`; do that only deliberately, never during an e2e run. Expect `200 {"status":"ok"}`. A `503 {"error":"Database unavailable"}` means the app could not query Neon; the server log names the cause.

## Limitations — do not overclaim

- **Only authentication, shift listing, posting, claiming and cancelling, credential expiry and credential upload are tested.** The upload is proven on the dev database with documents in Postgres; no deployed upload or download has been checked, and there is no virus scanning or license verification. Timesheets are a nurse view of current assignments only: there is no `Timesheet` model, timesheet API, recorded hours, or agency or admin timesheet view, so nothing tests them. Only successful posts, claims, cancellations and credential saves are audited (no logins or failed attempts, and no events for the seeded shifts), and the audit page shows only the newest 50 events; admin cancellation is reachable through the API only, and the admin overview has no cancel UI. The overview itself has no manual-screen record beyond the e2e specs unless noted in its plan. There is no component-level testing, and no test verifies the production deployment. Tracked in [exec-plans/tech-debt-tracker.md](exec-plans/tech-debt-tracker.md) (TD-1).
- Integration and e2e tests depend on the Neon `dev` branch and the network. A failure may be connectivity rather than a defect: on 2026-10-16 a migration failed with `P1001` (TCP 5432 timed out) and succeeded on retry the next day.
- `pnpm check:docs` validates link *targets*, not anchors, not URL reachability, and not HTML or MDX links. It skips code spans and fenced blocks and does not follow symlinked directories.
- Git hooks inspect the working tree, not the exact staged or pushed snapshot. A clean `pre-commit` run does not prove a partially staged commit builds. `pre-commit` also *skips* `typecheck` when `.next/types/` is absent rather than failing — so a never-built tree gets less coverage than the message implies.
- **There is no CI.** Every check above runs only where someone runs it. Tracked as debt.
- The automatic Node pin covers nvm installs only. With another version manager, or with the pinned version not installed, the hooks keep the shell's `PATH` and `engine-strict` fails them loudly rather than letting them pass on the wrong Node.
- Hook feedback is documentation-only. It never establishes application behavior.
- Adapter unit tests establish **helper** behavior. They do not establish that Claude Code loaded, trusted, or executed the hook — that is a separate, currently unverified observation. See [HOOKS.md](HOOKS.md).
- Every command in this document runs without any agent tool installed. Nothing here requires Claude Code.

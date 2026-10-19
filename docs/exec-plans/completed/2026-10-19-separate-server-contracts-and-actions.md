# Separate server code, contracts and actions from the frontend

Status: Complete, pending owner review of the agent proposals
Owner: current agent
Created: 2026-10-19

## Goal and acceptance criteria

Owner requirement (2026-10-19): `src/features/` is frontend-only. Server code lives in `src/server/<module>/`, shared contracts in `src/contracts/<module>/`, and Server Actions in `src/actions/<module>.ts`. Behavior does not change; this is a move plus import, test, config and documentation updates.

Acceptance:

- `src/features/**` contains only components, hooks and UI helpers. No `server/` folders, no `"use server"` files, no DTO types, Zod schemas or pure domain helpers.
- `src/contracts/<module>/` holds what the frontend and the server share: DTO types, Zod schemas, enums and statuses, and pure helpers (`status`, `schedule`, `hours`, `document`, `describe-event`, and `workspace` for auth). It imports neither `server-only`, `@/server`, `@/features` nor `@/actions`.
- `src/server/` holds `db.ts`, `errors.ts`, `http.ts` and the per-module services, policies, presenters, auth internals and `auth/constants.ts`. Frontend code cannot import it; ESLint enforces that.
- `src/actions/auth.ts` holds `signIn`/`signOut` (the current `features/auth/actions.ts`). Actions import from `@/server` and `@/contracts` and are the only client-to-server entry besides `src/app/api/`.
- `src/shared/server/` no longer exists. `src/shared/client/` and `src/shared/ui/` stay.
- Tests move beside the code they cover. `tests/integration/*` imports are updated.
- `ARCHITECTURE.md`, `docs/VERIFICATION.md`, `docs/DESIGN.md` (paths only), `docs/exec-plans/tech-debt-tracker.md` and any other doc naming a moved path are current. `pnpm verify` passes.

Non-goals: behavior changes, renames beyond directory moves, new modules.

## Context

Baseline: server code is split between `src/features/<m>/server/` and `src/shared/server/`, with `features/auth/actions.ts` and pure shared helpers sitting beside components.

Target layout:

```
src/
  actions/auth.ts
  contracts/
    audit/        types, describe-event (+ test)
    auth/         types, schemas, workspace
    credentials/  types, schemas, status, document (+ tests)
    shifts/       types, schemas, schedule (+ tests)
    timesheets/   types, hours (+ test)
  server/
    db.ts, errors.ts, http.ts (+ http.test.ts)
    auth/         constants, password, token, sessions, login, request-auth, current-user (+ tests)
    shifts/       shift-service, shift-policy, shift-presenter (+ tests)
    credentials/  credential-service
    audit/        audit-service, audit-presenter (+ test)
    timesheets/   timesheet-service, timesheet-presenter (+ test)
  features/<m>/components/       frontend only
  shared/client/ (api-client.ts, use-server-refresh.ts), shared/ui/
  app/, proxy.ts
```

Placement notes found while inspecting:

- `features/shifts/use-server-refresh.ts` is a client hook used by the timesheets, audit and credentials features, so it moves to `src/shared/client/`. Features must not import each other's internals.
- `features/auth/constants.ts` (`SESSION_COOKIE`, `SESSION_TTL_SECONDS`) is used only by the proxy, the logout route, the action and a test, never by components. It moves to `src/server/auth/constants.ts`. It must stay free of `server-only`, because `src/proxy.ts` imports it.
- `server/auth/password.ts` and `server/auth/token.ts` keep their no-`server-only` rule (seed script, proxy). Keep the existing comments.
- `features/auth/workspace.ts` is a plain role-to-path map imported by the proxy and possibly UI, so it goes to `contracts/auth/`.
- Cross-module server imports (`shift-service` to `audit-service`, `credential-service`) stay as `@/server/...`.
- `server/` and `contracts/` must not import `@/features`. Verify by grep: none do today beyond the pure helpers being moved.
- Server Action files may only export async functions. Keep `src/actions/auth.ts` limited to that.

Enforcement (agreed direction, to be confirmed in review): ESLint `no-restricted-imports`/`import/no-restricted-paths` in `eslint.config.mjs`:

- `src/features/**`, `src/shared/**` and `src/contracts/**` cannot import `@/server/**`.
- `src/contracts/**` cannot import `@/features/**`, `@/actions/**` or `@/shared/**`.
- `src/server/**` cannot import `@/features/**` or `@/actions/**`.
- `src/app/**` pages and the proxy may import `@/server` (Server Components and the proxy are server code); client components under `src/app` do not exist today.

## Steps and progress

- [x] Baseline on `main` before moving anything (2026-10-19): `pnpm check:docs` "Harness documentation checks passed."; `pnpm lint` and `pnpm typecheck` no output, exit 0; `pnpm test` 23 files, 220 tests passed.
- [x] Read `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` and `.../03-api-reference/01-directives/use-server.md`. A `"use server"` file is the way Client Components import actions, and every action is an untrusted entry point that must authenticate and validate. `src/actions/auth.ts` keeps that shape; its only non-function export is a type, which is erased.
- [x] `git mv` of 49 files into the layout above, on branch `refactor/separate-server-contracts-actions`, with a script that also moved tests with their subjects. Git reports them as renames. The emptied `features/*/server/` and `shared/server/` directories were removed with `rmdir`.
- [x] Rewrote imports in 134 files across `src`, `tests`, `e2e` and `prisma/seed.ts`, resolving each specifier against the file's old location. `@/` aliases everywhere except same-folder siblings. `pnpm typecheck` passed straight after.
- [x] `vitest.config.mts`, `tsconfig.json`, `scripts/harness.json` and `scripts/check_harness.py` name no moved path; unchanged.
- [x] ESLint boundary rules added in `eslint.config.mjs` with core `no-restricted-imports` (no new dependency). Proof: four scratch files, one per rule family (a feature importing `@/server/db`, a feature importing `../../../server/db`, a contract importing `server-only` and `@/server/errors`, a server file importing `@/actions/auth` and `@/features/...`) produced 6 errors, then the files were deleted and `pnpm lint` exited 0.
- [x] Docs updated: `ARCHITECTURE.md` (stack row, `db.ts` path, boundaries bullets with the three-folder rule, layout tree, dependency rules, §4 ownership sentence), `docs/VERIFICATION.md` path table row, `tech-debt-tracker.md` TD-11 and TD-18 paths, and two entries in `docs/decisions.md`. `docs/DESIGN.md` names only component paths that did not move, and the README names no moved path, so neither changed.
- [x] `grep -rnE "shared/server|features/[a-z]+/server|features/auth/actions"` over the repo (excluding `node_modules`, `.next`, `.git`, the generated client and `exec-plans/completed`) matches only this plan.
- [x] `pnpm verify` exited 0 (see Verification).

## Decisions and discoveries

- 2026-10-19, owner: contracts live in `src/contracts/<module>/`, not `features/`. Server Actions live in `src/actions/<module>.ts`, not under `src/server/`, because actions are the public client-to-server boundary and `src/server/` must stay unimportable from frontend code.
- 2026-10-19, owner: split `server/` out of `features/`, one folder per module.
- Proposal (agent): `use-server-refresh` to `shared/client`; `constants.ts` to `server/auth`; `workspace.ts` to `contracts/auth`. Confirm if the owner prefers otherwise.
- Proposal (agent): the ESLint boundary rules above.

## Verification

Run on branch `refactor/separate-server-contracts-actions`, 2026-10-19:

- Baseline on `main`: `pnpm check:docs` passed; `pnpm lint`, `pnpm typecheck` exit 0; `pnpm test` 23 files, 220 tests passed.
- After the change, `pnpm verify` (`check:docs`, `lint`, `build`, `typecheck`, `test`, `test:e2e`) exited 0: "Harness documentation checks passed."; "Compiled successfully"; `Test Files 23 passed (23)`, `Tests 220 passed (220)`; Playwright `110 passed (1.3m)`. The build still logs the two TD-18 "Unhandled API error: Route /api/credentials/document needs to bail out of prerendering" lines, as before.
- Lint boundary proof: four deliberate violations gave 6 `no-restricted-imports` errors (feature to `@/server` by alias and by relative path, contract to `server-only` and `@/server`, server to `@/actions` and `@/features`); removed, lint exits 0.
- Test count unchanged (220) and e2e unchanged (110), so no test was lost in the moves.

Acceptance check: `src/features/**` holds only `components/`; `src/contracts`, `src/server` and `src/actions/auth.ts` exist as laid out; `src/shared/server` is gone; the greps for forbidden imports and stale paths came back empty; the docs named in the criteria are current.

## Handoff or outcome

Complete. Server code, contracts and Server Actions are separated and ESLint enforces the boundaries. Behavior is unchanged.

Known gaps: two component-to-component imports across features predate this plan and remain (`shifts/components/marketplace.tsx` imports the credentials banner; `timesheets/components/timesheet.tsx` imports shifts' `StatCard`). Moving them was a non-goal. The agent placements (`use-server-refresh`, `constants`, `workspace`, the lint rules) are recorded in `docs/decisions.md` as agent defaults awaiting owner review. Nothing is committed yet; the plan suggested commits by context.

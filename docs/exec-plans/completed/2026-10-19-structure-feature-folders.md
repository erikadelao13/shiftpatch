# Give each feature folder a real internal structure

Status: Completed 2026-10-19 (agent defaults, awaiting owner review of the open decision)
Owner: current agent
Created: 2026-10-19

## Goal and acceptance criteria

After the server/contracts/actions split, `src/features/<m>/` holds only a `components/` folder, and everything in it sits at one level: stateful screens with 200+ lines next to 19-line badges, with the mutation logic (`apiFetch`, pending and error state) buried inside the screens. This plan gives features a structure a reader can navigate, without adding layers that carry no weight. Behavior does not change.

Acceptance:

- Every feature folder splits by role. `views/` holds client screens that own state and talk to the server (one per page-level UI). `components/` holds presentational pieces (props in, JSX out). `hooks/` holds client state and mutation logic. `lib/` holds UI-only pure helpers and their tests. A folder exists only when it has content.
- `src/contracts/` holds only what the server also uses. Today `contracts/shifts/schedule.ts`, `contracts/audit/describe-event.ts` and `contracts/timesheets/hours.ts` have no server consumer; they move to `features/<m>/lib/`. A helper moves back to `contracts/` the day server code needs it.
- No feature imports another feature. `StatCard` moves to `src/shared/ui/`, the generic date formatter moves to `src/shared/lib/`, and the credentials banner reaches the marketplace by composition from the page. This resolves TD-20.
- ESLint refuses an import from `@/features/<other>/**` inside a feature. A deliberate violation fails lint, then is removed.
- `ARCHITECTURE.md` (layout tree, dependency rules), `docs/decisions.md` and `tech-debt-tracker.md` (TD-20 deleted) are current. `pnpm verify` passes with the same test counts as before (220 unit and integration, 110 e2e).

Non-goals: behavior, visuals, renames beyond what a move needs, barrel `index.ts` files (ARCHITECTURE.md §3 forbids letting a barrel make server code reachable from a client component), TanStack Query, any change under `src/server/`.

## Context

Measured on 2026-10-19 after the server/contracts/actions split:

| Feature | Files in `components/` | Stateful (`use client`) | Notes |
| --- | --- | --- | --- |
| shifts | 14 | 5: `shift-board` (196 lines), `marketplace` (246), `admin-shift-overview` (157), `post-shift-dialog` (234), `reopen-shift-dialog` (221) | `shift-board` and `marketplace` import `apiFetch` and `useServerRefresh` directly |
| credentials | 3 | 1: `credential-upload-form` (263) | |
| timesheets | 2 | 1: `timesheet` (181) | |
| audit | 2 | 1: `audit-log` (116) | |
| auth | 1 | 1: `login-form` | one file; keep it in `components/` |

Consumers of each `contracts/` file (server, app and actions on one side, frontend on the other):

- Server-used, stay: `auth/schemas`, `auth/types`, `auth/workspace`, `credentials/{document,schemas,status,types}`, `shifts/{schemas,types}`, `audit/types`, `timesheets/types`.
- Frontend only, move to `features/<m>/lib/`: `shifts/schedule` (13 frontend consumers, 0 server), `audit/describe-event` (1, 0), `timesheets/hours` (2, 0).

Cross-feature imports today: `shifts/components/marketplace.tsx` imports the credentials banner; `timesheets/components/timesheet.tsx` imports shifts' `StatCard`; and once `describe-event` moves into `audit/lib` it would import `formatDate` from shifts, so the date formatter needs a neutral home.

Target layout (folders created only when they have content):

```
src/features/
  shifts/
    views/        shift-board, marketplace, admin-shift-overview
    components/   shifts-table, open-shifts-table, my-shifts-table, admin-shifts-table,
                  assigned-nurse, filter-select, status-badge, status-tabs, summary-cards,
                  post-shift-dialog, reopen-shift-dialog
    hooks/        use-shift-actions (post, claim, cancel: apiFetch, pending, error)  [see Steps]
    lib/          schedule (+ test): endsNextDay, durationHours, summarize, formatTimeRange,
                  compareShifts, formatEndsOn
  credentials/
    views/        credential-upload-form
    components/   credential-banner, current-credential
  timesheets/
    views/        timesheet
    components/   timesheet-table
    lib/          hours (+ test)
  audit/
    views/        audit-log
    components/   audit-log-table
    lib/          describe-event (+ test)
  auth/
    components/   login-form
src/shared/
  ui/             + stat-card
  lib/            dates.ts: formatDate (+ test, moved from shifts/schedule)
  client/         api-client, use-server-refresh
```

Rules the layout implies:

- `app/` pages compose views and own data loading. A page may pass one feature's component into another feature's view as `children` or a prop; features never import each other.
- `views/` may use `components/`, `hooks/`, `lib/`, `@/contracts`, `@/actions`, `@/shared`. `components/` stays presentational: no `apiFetch`, no server calls.
- `lib/` has no React and no I/O.

## Steps and progress

- [x] Baseline: `pnpm check:docs`, `pnpm lint`, `pnpm typecheck`, `pnpm test` green before moving anything. Record the output below.
- [x] Cut a branch from the merged split: the split was uncommitted on `refactor/separate-server-contracts-actions`, so it was committed first (`49c7f39`, `392b242`) and `refactor/structure-feature-folders` was cut from it.
- [x] Shared extraction, done with one addition (see Decisions) (removes the cross-feature imports): `git mv` `StatCard` to `src/shared/ui/`; split `formatDate` out of `contracts/shifts/schedule.ts` into `src/shared/lib/dates.ts` with its tests; make the credentials banner a prop or `children` of `Marketplace`, rendered by `nurse/page.tsx`. Typecheck, then run the e2e specs `nurse-ui` and `timesheets-ui`.
- [x] Move `schedule`, `describe-event` and `hours` (with their tests) from `contracts/` to `features/<m>/lib/` using `git mv`. Rewrite imports. Remove the then-empty `contracts/audit/` entry for `describe-event` only; `types.ts` stays.
- [x] Split each feature's `components/` into `views/` and `components/` per the target layout, with `git mv`, and rewrite imports. Typecheck after each feature.
- [x] Hooks, one at a time, each a pure extraction verified by the existing e2e specs. First read how `shift-board.tsx` and `marketplace.tsx` call `apiFetch` (post, claim, cancel) and extract `hooks/use-shift-actions.ts` only if the pending and error handling is genuinely the same in both. If it differs, leave the logic in the views and record why under Decisions. Do not extract hooks that have one caller and no state worth naming.
- [x] ESLint: per-feature `no-restricted-imports` blocks (generated from a list of feature names) refusing `@/features/<other>/**` and the matching relative paths; extend the `src/contracts/**` rule if needed. Prove it with one deliberate violation, then remove it.
- [x] Docs: `ARCHITECTURE.md` (layout tree, dependency rules, one sentence on what each folder holds), `docs/decisions.md` (entry), delete TD-20 from `tech-debt-tracker.md`, update any path in `docs/DESIGN.md` that names a moved file.
- [x] `grep -rn "contracts/shifts/schedule\|contracts/audit/describe-event\|contracts/timesheets/hours\|features/[a-z]*/components/\(stat-card\|credential-banner\)"` returns nothing outside completed plans.
- [x] Run `pnpm verify`. Record output.

## Decisions and discoveries

- 2026-10-19, agent finding: the three helpers the split put in `contracts/` have no server consumer, so they were frontend code in the wrong place. The rule is "contracts hold what both sides use".
- Proposal (agent): folder names `views/`, `components/`, `hooks/`, `lib/`. `views/` over `containers/` or `screens/` because Next.js already uses "page" and "layout" and these are not routes. Rename if the owner prefers another word.
- Proposal (agent): no barrel files; cross-feature reuse goes through composition in `app/`, or through `shared/`.
- Proposal (agent): hook extraction is gated on real duplication (see Steps). If it turns out there is none, this plan completes with `views/`, `components/` and `lib/` only, and says so.
- 2026-10-19, discovery: moving `hours` into `timesheets/lib/` and `schedule` into `shifts/lib/` exposed more cross-feature imports than the plan listed. `timesheets` used `durationHours` and `formatEndsOn` from shifts. They moved with `endsNextDay` to `src/shared/lib/shift-time.ts` (and their tests to `shift-time.test.ts`). `shifts/lib/schedule.ts` keeps `summarize`, `formatTimeRange` and `compareShifts`.
- 2026-10-19: no hooks extracted. `shift-board` and `marketplace` share only the `apiFetch` call and the refresh-on-failure skeleton; their notice types, cancel reasons and pending state differ, and post and claim each have one caller. The plan therefore ends with `views/`, `components/` and `lib/`.
- 2026-10-19: the marketplace takes a `banner` prop (a `ReactNode`) rather than `children`, because the banner sits between its header and the notice.
- 2026-10-19: `shared` also cannot import `@/features` now (ESLint), beyond the plan's wording.
- Open for the owner: is `views/` worth a separate folder for five features, two of which have one view? Alternative: split only `shifts/` and keep the others flat. The plan assumes one consistent shape for all features.

## Verification

- Baseline, before any move (split working tree): `check:docs` passed, `lint` and `typecheck` clean, `pnpm test` 23 files, 220 tests passed.
- Deliberate violations (two in `features/shifts/lib/`, one in `shared/lib/`) failed `pnpm lint` with 3 errors: `'@/features/timesheets/lib/hours' import is restricted ... The shifts feature cannot import the timesheets feature`, `'../../audit/lib/describe-event' ... The shifts feature cannot import another feature`, and `'@/features/shifts/lib/schedule' ... Shared code cannot import @/features`. The files were removed and `pnpm lint` was clean again.
- Final `pnpm verify` (check:docs, lint, build, typecheck, test, test:e2e) exited 0. Separate `pnpm test` run: 25 files, 220 tests passed. e2e: 110 passed (1.4m).
- Final grep for the old paths: the only hits outside completed plans are `import { CredentialBanner } from "@/features/credentials/components/credential-banner"` in `nurse/page.tsx` and `nurse/credentials/page.tsx`. That is the composition from `app/` the plan calls for, and the banner's file did not move.

## Handoff or outcome

Done on branch `refactor/structure-feature-folders`, uncommitted until the commit that moves this plan. The plan's behavior-neutral goal holds: 220 unit and integration tests and 110 e2e pass. Open for the owner: whether `views/` is worth a folder for the features with one view.

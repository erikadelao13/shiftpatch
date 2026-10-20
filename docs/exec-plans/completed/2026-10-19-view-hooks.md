# Move view behavior into hooks

Status: Complete 2026-10-19 (agent defaults awaiting owner review)
Owner: current agent
Created: 2026-10-19

## Goal and acceptance criteria

Owner request (2026-10-19): views and components focus on rendering. State, effects, requests, mutations and event logic move into hooks, with one coordinating hook per view that has behavior, composed from smaller hooks for distinct responsibilities. Pure calculations stay in `lib/`. Server Components and server-side rules, validation and authorization do not move. The documentation states the rule once, links to it elsewhere, and drops the rule that a hook may exist only when two views share it.

Acceptance:

- No file in `src/features/*/views/`, `src/features/*/components/` or `src/shared/ui/` calls `useState`, `useReducer`, `useRef`, `useEffect`, `useLayoutEffect`, `useActionState`, `useTransition`, `useOptimistic`, a TanStack Query hook, `apiFetch` or a Server Action. ESLint refuses them there; a deliberate violation fails `pnpm lint`, then is removed.
- Each view with behavior calls exactly one coordinating hook from its feature's `hooks/`. A component with its own UI behavior (the two dialogs, the status tabs) calls one hook too.
- Filtering, counting and tab construction that views computed inline live in `lib/` with unit tests.
- Behavior, API contracts, authentication, permissions and every `data-testid` are unchanged. No e2e spec changes.
- ARCHITECTURE §4 holds the canonical rule; §3, AGENTS.md, DESIGN and decisions.md link to it or record the change without restating it. The superseded rules stay in `decisions.md` as history, with a new dated entry.
- `pnpm verify` passes with at least the baseline counts (220 unit and integration, 141 e2e) plus the new unit tests.

Non-goals: visual changes, new UI features, component-level testing (TD-1), extracting shared presentational components such as a notice banner or refresh button, anything under `src/server/`, `src/contracts/`, `src/actions/` or `src/app/api/`.

## Context

Baseline (`8becd12`, 2026-10-19), recorded by the TanStack Query plan: 220 unit and integration tests and 141 e2e tests pass.

Files with inline behavior: `shifts/views/{shift-board,marketplace,admin-shift-overview}`, `shifts/components/{post-shift-dialog,reopen-shift-dialog,status-tabs}`, `credentials/views/{credential-upload-form,credential-status,credential-workspace}`, `audit/views/audit-log`, `timesheets/views/timesheet`, `auth/components/login-form`, `shared/ui/sign-out-form`.

Rules this replaces: ARCHITECTURE §3 "`hooks/` appears only when two views share state or mutation logic"; decisions.md 2026-10-19 "No `hooks/` folder, no `use-shift-actions`", the view definition "owns state and calls the server", and "Mutations stay inline in the views".

## Steps and progress

- [x] Read the code, docs and the last two refactor plans; record the baseline.
- [x] Add `lib/` helpers and tests: `shifts/lib/filters` (status tabs, status, agency and role filters), `shifts/lib/reopen` (dialog copy and types), `shared/lib/text` (`plural`, `initialsOf`, replacing three local count helpers and two copies of `initialsOf`).
- [x] Add shared hooks (`shared/hooks/`): `useQueryRefresh` (admin overview, audit log, timesheets) and `useSignOut`.
- [x] Add feature hooks and slim the views and components to rendering: `useShiftBoard`, `useMarketplace`, `useAdminShiftOverview` (composing `useAgencyShiftMutations`, `useNurseShiftMutations`, `useMarketplaceFilters`, `useStatusTabs`), `usePostShiftDialog` and `useReopenShiftDialog` (both on `useModalDialog`), `useArrowKeyTabs`, `useCredential`, `useCredentialUpload` (with `useFileDrop`), `useAuditLog`, `useTimesheet`.
- [x] Move `login-form` to `auth/views/` with `useLoginForm`.
- [x] Add the ESLint guard and prove it with a deliberate violation.
- [x] Update ARCHITECTURE, AGENTS, DESIGN, decisions and the doc review fixes.
- [x] Run `pnpm verify`; record results.

## Decisions and discoveries

Agent defaults, not yet reviewed by the owner:

- Hooks shared by more than one feature live in `src/shared/hooks/`, beside `shared/ui` and `shared/lib`.
- `login-form` becomes a view: it calls a Server Action, which the rule now keeps out of components.
- Static copy and class maps that only choose what to render may stay with their component; calculations over data go to `lib/`.
- Mutations get one hook per actor instead of one shared hook; the dialogs stay in `components/` with their own hooks. Recorded in [decisions.md](../../decisions.md) "2026-10-19: placements for view hooks".

Discoveries:

- 2026-10-19: the React Compiler lint (`react-hooks/refs`) flags every `board.x` read once a hook returns a ref inside its result object, so views destructure what their hook returns. The dialogs already did and passed.
- 2026-10-19: in flat config a later `no-restricted-imports` block replaces an earlier one's options, so each render-only block repeats its folder's boundary patterns. The probe below shows the cross-feature rule still fires inside `views/`.
- 2026-10-19 doc review (read-only audit, then checked against the files): fixed the ARCHITECTURE status, layout tree (no `providers.tsx` or `docs/acceptance.md`, `e2e/` not `tests/e2e`, the view routes, timesheet and credentials pages, `hooks/`), the claim that there is no audit API, the admin "Create a shift" cell (code returns `403`), the proposal labels on the view routes, the docs index status column, DESIGN's status and stale refresh wording, PRODUCT's status and "no timesheets API" note, VERIFICATION's Node 20 and timesheet-API claims, and the handoff skill's "thin e2e" claim. PRODUCT's permission and test-ID tables and ARCHITECTURE §11's command list became links to their canonical copies.
- Left for the owner: `2026-10-16-project-harness-setup.md` has every criterion ticked while its handoff says one is open; README's command and CI summaries repeat VERIFICATION but are the human entry point and link to it.

## Verification

- `pnpm lint` and `pnpm typecheck` pass after the refactor. The first lint run failed with 47 `react-hooks/refs` errors in `shift-board.tsx` and `credential-upload-form.tsx`; destructuring the hook results fixed them.
- Guard proof: three throwaway files (a view, a component, `shared/ui`) importing `useState`, `useMutation`, `apiFetch`, `@/actions/auth`, another feature's hook, `useEffect`, `useQueryClient` and `useRef` gave 8 `no-restricted-imports` errors, including the cross-feature message inside `views/`; `use-marketplace.ts` gave none. The files were deleted.
- `vitest run src/features/shifts/lib src/shared/lib`: 5 files, 24 tests passed (14 new).
- `pnpm verify`, run 1: docs check, lint, build, typecheck, 234/234 unit and integration tests, then 140/141 e2e. `query-cache.spec.ts` "/admin/timesheets sends no request to its GET routes" landed on the route's `error.tsx`. Rerun alone with `--repeat-each=3`: 30/30 passed. Unexplained; most likely another spec changing rows on the shared `dev` branch mid-load (TD-19).
- `pnpm verify`, run 2: failed in `pnpm test` with two 5 s timeouts on the Neon `dev` branch (`cancellations.test.ts` admin cancel, `timesheets.test.ts` agency scoping). No file under `src/server`, `src/contracts`, `src/actions`, `src/app/api` or `prisma` differs from `HEAD`.
- `pnpm verify`, run 3: every stage passed. Harness checks, lint, build, typecheck, 27 files and 234 tests, 141/141 e2e. No e2e spec was changed.
- Not done: a manual look at the screens. Nothing visible was meant to change, and the e2e specs cover each screen's states.

Playwright reused the `next dev` already running on port 3000 (started 22:43, before the edits); it hot-reloads, and no route directory moved.

## Handoff or outcome

Views and components now only render; hooks hold every view's state, effects, queries, mutations and handlers; filters and counts live in `lib/` with tests; ESLint keeps it that way. ARCHITECTURE §4 holds the rule and the other documents link to it.

Gaps: hooks have no unit tests (TD-1 updated); the one-off e2e failure and the two integration timeouts above are unexplained; the agent defaults in [decisions.md](../../decisions.md) need owner review; the 2026-10-16 harness-setup plan still needs its own close-out.

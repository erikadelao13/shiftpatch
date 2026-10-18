# Shift listing and agency posting

Status: Complete
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-17

## Goal and acceptance criteria

Put shifts in the database and serve them through the three spec routes that list and create them. Connect the existing agency board UI to that data, so an agency sees its real shifts and a posted shift persists.

Acceptance:

- [x] **`GET /api/shifts`.** Any signed-in role gets `200 { shifts: ShiftDTO[] }` covering every shift from both agencies, including filled ones. The seeded `shift-1`, `shift-2` and `shift-3` match the spec field for field, with exactly the nine DTO keys. A request without authentication gets `401 { error }`.
- [x] **`GET /api/agencies/:agencyId/shifts`.** An agency asking for its own ID gets `200 { agencyId, shifts }` holding only its shifts: agency-a gets `shift-1` and `shift-2`, agency-b gets `shift-3`. An agency asking for the other agency's ID gets `403`, and so does a nurse. The admin gets `200` for any existing agency and `404` for an unknown one. No authentication gets `401`.
- [x] **`POST /api/shifts`.** An agency gets `201` with a ShiftDTO: `status: "open"`, `claimedBy: null`, and the caller's own `agencyId`. An `agencyId` in the body is ignored. The shift persists. A nurse or the admin gets `403`. Malformed JSON, a missing or invalid field, a role other than RN or LPN, or a start time equal to the end time each get `400 { error }`. Overnight shifts and past dates are accepted.
- [x] **Agency board reads the database.** agency-a sees `shift-1` (open, unassigned) and `shift-2` (filled by Maria Lopez); agency-b sees only `shift-3`.
- [x] **Posting from the board.** Open the form with `agency-post-shift-button`, fill it in, and submit with `agency-post-shift-submit-button`. That calls `POST /api/shifts`, shows "Shift posted" in `notification-banner`, and the new shift is still listed after a reload. While the request is pending, the submit button is disabled. If the post fails, the form stays open with everything typed still in place and the error in `notification-banner`. Fields that fail validation show their error next to the field, and no request is sent.
- [x] **Status is `open | filled` everywhere.** The Cancelled tab and badge are gone, and the open item about it in `docs/decisions.md` is closed.
- [x] **No sample data left.** `sample-shifts.ts` is deleted. `pnpm db:seed` loads the three spec shifts exactly. Responses are built by an explicit serializer, never by spreading Prisma rows.
- [x] **Docs and checks.** The docs listed in step 7 are updated, and `pnpm verify` passes: check:docs, lint, build, typecheck, test, e2e.

Non-goals:

- Claim and cancel routes, and the claim race (the next plan).
- The nurse marketplace UI (`shift-list-item` cards). The nurse page stays a placeholder; owner decision 2026-10-17.
- The admin dashboard, audit events, timesheets and assignment history.
- TanStack Query, the date-range filter, the Rate and Details columns, loading skeletons.
- Deployment, the production branch, CI (TD-2).

## Context

**Baseline.** Commit `b20ec44` on `main`, plus uncommitted UI work in the working tree:

- The workspace pages moved into `src/app/(workspace)/(standard)/`.
- A new agency shell: `src/app/(workspace)/agency/layout.tsx`, `src/shared/ui/sidebar.tsx`, `src/shared/ui/icons.tsx`.
- The shift board UI in `src/features/shifts/`, which runs on client-side sample data (`sample-shifts.ts`).
- Edits to `ARCHITECTURE.md` and `docs/DESIGN.md` that describe it.

Step 0 deals with this.

**Requirements.** The supplied spec, [../../ShiftPatch-Technical-Spec.md](../../ShiftPatch-Technical-Spec.md), routes 2, 3 and 6, stays unchanged. The rules that matter here:

- Every shift response has the same nine keys: `id, agencyId, agencyName, role, date, startTime, endTime, status, claimedBy`.
- `claimedBy` is `null` when the shift is open.
- Errors are always `{ "error": "..." }`.
- The three shifts must be seeded exactly.
- `shift-7` in the spec is only an example ID; it doesn't need to be hardcoded.

**Product.** [../../PRODUCT.md](../../PRODUCT.md): Journey A, PR-02, PR-03, PR-04 and PR-13, and the business rules on identity, agency boundaries and overnight shifts. Don't reject a shift just because its date is in the past.

**Architecture.** [../../../ARCHITECTURE.md](../../../ARCHITECTURE.md):

- §3 boundaries: Route Handlers stay thin; services hold the rules; Prisma calls live in feature server modules.
- §5 persistence model.
- §6 DTO and error semantics.
- §7 permission table.

**Design.** [../../DESIGN.md](../../DESIGN.md) §7 (the agency dashboard), §8, and §11 (loading, empty and error states).

**Next.js 16 references.** Read before writing code:

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`: `params` is a Promise, and the global `RouteContext<'/api/agencies/[agencyId]/shifts'>` helper types it.
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, "With Cache Components": a `GET` handler runs at request time once it reads runtime data. `requireActor` reads the headers first, so these handlers stay dynamic.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`: `router.refresh()` re-renders Server Components but keeps client `useState`. That is why the board must render from props instead of a copy kept in state.

**Reuse, don't rebuild:**

| Need | Existing code |
| --- | --- |
| Request guard | `requireActor(request)` in `src/features/auth/server/request-auth.ts`. Bearer or cookie; the Origin check on cookie POSTs |
| Page role check | `requireRole("agency")` in `src/features/auth/server/current-user.ts` |
| Error responses | `HttpError` and `errorResponse()` in `src/shared/server/errors.ts`. ZodError becomes 400 with the first issue's message |
| Database | `getPrisma()` in `src/shared/server/db.ts` |
| Display helpers | `durationHours`, `summarize`, `formatDate`, `formatTimeRange`, `compareShifts` in `src/features/shifts/schedule.ts` |
| Fixtures and seed | `prisma/fixtures.ts`, `prisma/seed.ts` (upsert, dev-branch guard) |
| Test patterns | `tests/integration/auth.test.ts` (throwaway rows, `expectHttpError`, `beforeAll` seed check); `e2e/support.ts` (`deleteOwnRows`, `sessionIdOf`); `e2e/auth-api.spec.ts` (HTTP contracts through Playwright `request`) |

## Design

**Data model.** A new migration, `shifts`:

```prisma
enum ShiftRole   { RN LPN }
enum ShiftStatus { open filled }

model Shift {
  id          String      @id @default(dbgenerated("'shift-' || nextval('shift_id_seq')"))
  agencyId    String
  agency      Agency      @relation(fields: [agencyId], references: [id])
  role        ShiftRole
  date        DateTime    @db.Date
  startTime   String      @db.Char(5)
  endTime     String      @db.Char(5)
  status      ShiftStatus @default(open)
  claimedById String?
  claimedBy   User?       @relation(fields: [claimedById], references: [id])
  createdAt   DateTime    @default(now())

  @@index([agencyId, date, startTime])
}
```

Add the back-relations to `Agency` and `User`. Create the migration with `prisma migrate dev --create-only`, then add by hand the SQL that Prisma can't express:

- `CREATE SEQUENCE shift_id_seq START 4;`, placed before the table, so new IDs read `shift-4`, `shift-5`, and so on, never clashing with the seeds.
- `CHECK (("status" = 'open') = ("claimedById" IS NULL))`: an open shift has no nurse, and a filled one has exactly one. The claim plan relies on this.
- `CHECK` that both times match `^([01][0-9]|2[0-3]):[0-5][0-9]$`, and `CHECK ("startTime" <> "endTime")`.

Times stay `HH:MM` strings, and the date is a date-only column. Nothing is converted between timezones.

**Shared contract** (`src/features/shifts/`, importable by both client and server):

- `types.ts`:
  - `ShiftRole` and `SHIFT_ROLES` (RN, LPN).
  - `ShiftStatus = "open" | "filled"`.
  - `ShiftDTO`, matching the spec exactly.
  - `AgencyShift`, the board's view model: the DTO's display fields plus `nurseName`.
- `schemas.ts`: one zod `newShiftSchema` with these rules:
  - `role` is one of `SHIFT_ROLES`.
  - `date` uses `z.iso.date()`. Confirm that it rejects `2026-02-30`; if it doesn't, add a refine.
  - Times must match `HH:MM` in 24-hour form.
  - `endTime` must differ from `startTime`; the issue goes on `endTime`.

  Unknown keys, such as `agencyId`, are stripped. Write one message per rule that reads well both to a person and to an API caller. A helper turns issues into per-field errors for the form. This replaces the hand-written `validateNewShift`, so the client and the API cannot disagree.

**Server** (`src/features/shifts/server/`, each file starting with `import "server-only"`):

- `shift-presenter.ts`: `toShiftDTO(row)` picks the nine fields explicitly.
  - `date` comes from `row.date.toISOString().slice(0, 10)`. The pg adapter returns a date-only value as UTC midnight; test that the day doesn't shift.
  - `claimedBy` is `row.claimedById`.
  - `agencyName` comes from the included agency.
- `shift-policy.ts`: pure functions, no I/O.
  - `canPostShift(actor)`: an agency with a non-null `agencyId`.
  - `canReadAgencyShifts(actor, agencyId)`: the agency itself, or the admin.

  The claim and cancel plan extends this module.
- `shift-service.ts`: Prisma calls go straight in here, with no repository layer (ARCHITECTURE §3: "Add a repository wrapper only when it improves…").
  - `listShifts()`: every shift, ordered by `date`, `startTime`, `createdAt`.
  - `listAgencyShifts(actor, agencyId)`:
    - Check the policy before checking whether the agency exists, so an agency can't probe for other agency IDs; that case is a `403`.
    - Admin and an unknown ID: `404 "Agency not found"`.
  - `createShift(actor, input)`: refuses with `403 "Only agency accounts can post shifts"` unless the policy allows it; otherwise creates the shift under `actor.agencyId`.
  - `getAgencyBoard(agencyId)`: the `AgencyShift[]` for the page, with the nurse's name joined in.
  - `getAgencyName(agencyId)`, wrapped in React `cache()`. Both the agency layout and the page call it today, each running its own query; this makes it one query per request.

**HTTP** (thin adapters; every response sets `Cache-Control: no-store`):

- `src/shared/server/http.ts`: `readJson(request)`, which throws `HttpError(400, "Request body must be valid JSON")`. Move the login route onto it.
- `src/app/api/shifts/route.ts`:
  - `GET`: `requireActor`, then `listShifts`, then `{ shifts }`.
  - `POST`: `requireActor`, then `readJson`, then `newShiftSchema.parse`, then `createShift`, returning `201`.
- `src/app/api/agencies/[agencyId]/shifts/route.ts`: `GET` with `RouteContext` and `await ctx.params`, returning `{ agencyId, shifts }`.

**UI:**

- `src/shared/client/api-client.ts` (new, small): `apiFetch<T>(path, init)` for same-origin JSON. It throws an error carrying the server's `{ error }` message, or a plain "Could not reach the server" message when the network fails.
- `agency/page.tsx`: calls `getAgencyBoard` and `getAgencyName`, and passes `shifts` down. Delete the sample-data import.
- `agency/layout.tsx`: uses the cached `getAgencyName`.
- `shift-board.tsx`:
  - Render from the `shifts` prop, not from a `useState` copy.
  - Remove the Cancelled tab, `hasCancelled` and the fake `new-N` IDs.
  - Posting calls `apiFetch("/api/shifts", { method: "POST" })`, then `router.refresh()`.
- `post-shift-dialog.tsx`:
  - Validate with the shared schema before sending anything.
  - While pending, disable submit and label it "Posting…". Stay pending until the POST has returned and the refreshed data has rendered. Then close, return focus to "Post a shift", and show "Shift posted" in the board's banner.
  - On failure, keep the dialog open with every input untouched, and show the error in a `role="alert"` `notification-banner` inside the dialog. The modal makes the page behind it inert, so the error has to sit inside the dialog.
  - Show only one `notification-banner` at a time: clear the board's banner when the dialog opens.
- `status-badge.tsx`: drop the `cancelled` entry.
- `schedule.ts`: remove `countByStatus` and `validateNewShift`.
- Copy: the panel says "Upcoming shifts" and "Your agency's schedule for the week", and its empty states say "No shifts in this period". There is no date scope, and the seeded shifts (Oct 2–4) are in the past. Rename the panel to something accurate, such as "Your shifts" with "Every shift your agency has posted". Change the empty state and the Coverage card note to "No shifts posted yet."

## Steps and progress

- [x] **0. Baseline.**
  - The agency UI is uncommitted (see Context). Run `pnpm lint` and `pnpm typecheck` on it as it stands.
  - **Ask the owner** whether to commit it first as its own commits (recommended, with the `contextual-commits` skill), so this plan's diff stays reviewable. Don't build on the uncommitted tree without an answer.
  - Confirm that `.env.development` has `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH=dev` and `AUTH_JWT_SECRET`. Print key names only, never values.
- [x] **1. Schema, migration, seed.**
  - Add the models above, create the migration with `--create-only`, add the hand-written SQL, and apply it with `pnpm db:migrate` (dev branch only).
  - Then run `prisma migrate dev --create-only` once more. It must report that nothing changed. If Prisma tries to drop the sequence, rewrite the default, or touch the CHECK constraints:
    - Fall back to app-generated `shift-<uuid>` IDs.
    - Delete the empty migration it created.
    - Record the fallback under Decisions.
  - Add `fixtureShifts` to `prisma/fixtures.ts`, exactly as in the spec. The seed upserts them by ID: `update` puts each fixture shift back to its trial-start state and never touches any other shift.
  - Run `pnpm db:seed` twice to show it's idempotent.
- [x] **2. Shared contract, presenter, policy, with unit tests beside the code.**
  - `schemas.test.ts`:
    - Valid input, and an overnight shift.
    - Start equal to end; `24:00`; `7:00`; `2026-02-30`.
    - Role `CNA`; missing fields.
    - An `agencyId` in the body is stripped.
  - `shift-presenter.test.ts`: exactly the nine keys; the date doesn't shift by a day; `claimedBy` is null when open.
  - `shift-policy.test.ts`: the role × agency matrix.
  - Move the validation cases out of `schedule.test.ts`, and drop its cancelled cases.
- [x] **3. Service and integration tests.** `tests/integration/shifts.test.ts`, on the dev branch:
  - `beforeAll` fails with "Run `pnpm db:seed`" unless the three seeded shifts are in their spec state.
  - `listShifts` contains each seeded DTO exactly (`toContainEqual`), and the result covers both agencies.
  - `listAgencyShifts` scopes correctly for each role, with the 403 and 404 cases.
  - `createShift` runs under a throwaway agency and agency user, created like the throwaway users in `auth.test.ts`, so the fixture agencies stay clean. `afterAll` deletes the shifts, the user and the agency.
- [x] **4. Route Handlers and the HTTP contract.**
  - Add `http.ts`, the two route files, and move the login route onto `readJson`.
  - New `e2e/shifts-api.spec.ts`:
    - Every acceptance case for the three routes, with exact bodies and status codes.
    - `401` without a token.
    - A POST with `agencyId: "agency-b"` sent as agency-a lands in agency-a.
  - Extend `deleteOwnRows` in `e2e/support.ts` with `shiftIds`, and track every created ID.
- [x] **5. Connect the UI.**
  - Make the UI changes listed under Design.
  - **Tell the owner before deleting** `src/features/shifts/sample-shifts.ts`, and before removing `countByStatus`, `validateNewShift` and the `cancelled` badge entry.
  - New `e2e/agency-ui.spec.ts`:
    - agency-a sees `shift-1` and `shift-2` (with Maria Lopez) and not `shift-3`; agency-b sees `shift-3` only.
    - Posting through the test IDs:
      - Read the new ID from `page.waitForResponse` on `POST /api/shifts`.
      - The banner says "Shift posted".
      - The row appears, and is still there after `page.reload()`.
    - Start equal to end shows the field error, and no request is sent.
    - A server failure, mocked with `page.route` returning a 500 `{ error }`: the dialog stays open with its input intact, and the banner shows the error.
    - Clean up the created shifts.
- [x] **6. Manual check** on `pnpm dev`, following [../../VERIFICATION.md](../../VERIFICATION.md) "Manual and UI verification":
  - Look at the board at 375 px and 1440 px: populated, empty (a throwaway agency, or reasoning from code), pending, and error states.
  - Post a shift using only the keyboard; focus returns to "Post a shift".
  - Use `curl` for one Bearer call against each route.
- [x] **7. Docs.**
  - ARCHITECTURE.md:
    - Status line.
    - §2: change the TanStack Query row to "deferred until a view needs polling or cross-view invalidation; the agency board renders on the server and refreshes after a mutation". Mark it as a proposal.
    - §3: the layout. Mark the shift routes and files as implemented, and drop the `shift-repository.ts` line.
    - §4: the state-ownership row for shift lists.
    - §5: Shift is implemented, with its CHECK constraints and ID sequence; the seed invariants are implemented.
    - §6: the 403/404 semantics of the agency route.
    - §12: build sequence step 3.
  - DESIGN.md §7: replace the "UI only" note with what is now data-backed, the removed Cancelled tab, the new heading copy, and the posting states.
  - PRODUCT.md §7: shift roles are RN or LPN, marked as an owner decision (2026-10-17).
  - `docs/decisions.md`:
    - Owner decisions (2026-10-17): status is `open | filled`, with cancellation kept as history, which closes the open item; roles are RN and LPN only.
    - Agent defaults:
      - `shift-N` IDs come from a sequence.
      - An `agencyId` in the request body is ignored.
      - An agency reading another agency gets a 403, not a 404.
      - The admin cannot post (reading ARCHITECTURE §7's "no additional capability required" as no).
      - Re-seeding resets the three fixture shifts.
      - TanStack Query is deferred.
  - VERIFICATION.md: what `pnpm test` and `pnpm test:e2e` now prove; after a run the dev branch should hold 3 seeded `Shift` rows; the "Only authentication is tested" limitation.
  - tech-debt-tracker: update TD-1.
- [x] **8. Verify and hand off.** Run `pnpm verify` and record its real output here. Check the dev branch afterwards: only the seeded rows remain (2 `Agency`, 5 `User`, 3 `Shift`, no `ApiSession` or `LoginAttempt`). Tick the acceptance criteria that pass, and write down the next action.

## Decisions and discoveries

Owner decisions (2026-10-17, during planning):

- **Scope.** The two list APIs plus the agency board. The nurse marketplace UI comes with the claim plan, because the claim buttons go on the same cards.
- **The current status is `open | filled`.** Remove the Cancelled tab and badge. A cancellation reopens the shift and is kept as history; the admin view can show something like "Reopened after no-show" later. This resolves the open item in `docs/decisions.md`.
- **Shift roles are RN and LPN only.** Both a database enum and a zod enum; any other role gets 400. Adding a role later takes one migration.

Agent proposals, not yet reviewed by the owner:

- ~~`shift-N` IDs come from a Postgres sequence starting at 4~~ **Fallback taken (step 1):** IDs are `shift-<uuid>`, generated in `createShift`. Prisma rewrote the sequence default in a new migration on every `migrate dev` run.
- `agencyId` in a POST body is stripped, not rejected. The shift always goes to the caller's own agency.
- An agency reading another agency's list gets a 403, checked before existence, so agency IDs can't be probed. The admin gets a 404 for an unknown agency.
- The admin cannot post shifts.
- TanStack Query is not added. The agency board is a Server Component, and it refreshes with `router.refresh()` after a successful POST through the real Route Handler.
- Re-seeding restores `shift-1` to `shift-3` to their spec state and leaves every other shift alone.

Discoveries:

- 2026-10-17: the agency layout and the agency page each query the agency name; fixed with one cached lookup.
- 2026-10-17: "Upcoming shifts / for the week" doesn't describe what the panel shows: every shift, including past ones, with no date scope. The copy is fixed in step 5.
- 2026-10-17: the board copied its prop into `useState`, which `router.refresh()` would never update. It now renders from props.
- Not in this plan: DESIGN §11 asks for loading skeletons, while the page shows plain "Loading…" text.

## Verification

- Step 0: `pnpm lint` and `pnpm typecheck` passed on the uncommitted UI; the owner chose to commit it first. Committed on branch `feat/agency-shift-board-ui` as `71d4a3c`, `d8c5875`, `51d4105`.
- Step 1: migration `20261018011125_shifts` applied to the dev branch. A second `migrate dev --create-only` produced an empty migration, deleted. `pnpm db:seed` ran twice with "Seeded 2 agencies, 5 users and 3 shifts". The first attempt (sequence ID default) generated a drift migration each run; I removed those three migration folders and dropped the empty `Shift` table, sequence and enums on dev before redoing it with uuid IDs.
- Steps 2–3: Vitest `src/features/shifts` 31 passed; `tests/integration/shifts.test.ts` 10 passed.
- Step 4: `e2e/shifts-api.spec.ts` 13 passed. Step 5: `e2e/agency-ui.spec.ts` 6 passed.
- Step 6: curl with a Bearer token against `GET /api/shifts` (200), `GET /api/agencies/agency-a/shifts` (200), `GET /api/agencies/agency-b/shifts` as agency-a (403), `POST /api/shifts` with `agencyId: "agency-b"` (201, landed in agency-a). Keyboard-only post: dialog closed, focus returned to "Post a shift", banner "Shift posted". Screenshots at 375 px and 1440 px looked right. The empty and pending states were covered by e2e and code reading, not seen on screen.
- Step 8: `pnpm verify` exit 0: check:docs passed, lint clean, build compiled, typecheck clean, Vitest 10 files / 84 tests passed, Playwright 54 passed.
- Dev branch afterwards: 2 `Agency`, 5 `User`, 3 `Shift`, 0 `LoginAttempt`. `ApiSession` holds 9 rows that predate this work (nurse-1, admin-1, agency-a sign-ins from 2026-10-17 and early 2026-10-18); I deleted only the 4 from my manual check, so the plan's "no `ApiSession`" expectation is not met.

## Handoff or outcome

All steps are done and every acceptance criterion passes. The work is uncommitted on `feat/agency-shift-board-ui` (including this plan). Next action: owner review, then commit by context and move this plan to `completed/`. Owner may want to prune the 9 old `ApiSession` rows (TD-12).

After this plan: claim and cancel (`POST /api/shifts/:id/claim`, `POST /api/shifts/:id/cancel`, the race-safe conditional update, the nurse marketplace UI with `shift-list-item`, `shift-claim-button` and `shift-cancel-button`), building on `shift-policy.ts` and the status CHECK constraint.

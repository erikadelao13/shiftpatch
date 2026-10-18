# Shift cancellation and no-show

Status: Complete
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-17

## Goal and acceptance criteria

An authorized user reopens a filled shift by cancelling it in advance or by recording a no-show. The shift goes back to `open` with no nurse, and the reason, the previous nurse, the actor and the time are kept as history: a `Cancellation` row and an audit event, written in the same transaction as the reopening. The work covers the spec's route 5 and the UI already started for it.

Acceptance:

- [x] **Baseline committed.** The cancellation UI that is uncommitted on `main` is committed on `feat/shift-cancellation`, in its own commits, before any backend work starts. The owner first confirms that this UI work is finished, because those files were still changing while this plan was written.
- [x] **Contract.** `POST /api/shifts/:id/cancel` with `{ "reason": "no-show" | "advance" }` returns `200` with exactly ten keys: the nine ShiftDTO keys with `status: "open"` and `claimedBy: null`, plus `cancellation: { reason, previousNurseId }`, which has exactly those two keys. The reopened shift shows up as open in `GET /api/shifts`, on the agency board and in the nurse marketplace, and any nurse with a valid credential can claim it again.
- [x] **Permissions** (PRODUCT §7, ARCHITECTURE §7):
  - A nurse can cancel her own claim, in advance only.
  - An agency can cancel or record a no-show on a filled shift that belongs to it.
  - The admin can do both on any filled shift.
- [x] **Errors.** Each one is `{ error }` with `Cache-Control: no-store`, and the checks run in this order:
  1. `401` without authentication.
  2. `400` for malformed JSON, or a missing or unknown `reason`.
  3. `403` "Only agencies and admins can record a no-show".
  4. `404` "Shift not found".
  5. `403` "You can only cancel your own agency's shifts".
  6. `409` "Shift has no active assignment", for an open shift. This also covers a second cancel of the same claim.
  7. `403` "You can only cancel your own shifts", for a nurse on another nurse's claim.

  A rejected request changes nothing and writes no `Cancellation` or audit row.
- [x] **History.** Each successful cancel writes, in the same transaction as the reopening:
  - one `Cancellation` row: shift, reason, previous nurse, actor and time;
  - one `shift_cancelled` `AuditEvent` with `{ agencyId, reason, previousNurseId }`.

  When a reopened shift is claimed and cancelled again, it keeps both `Cancellation` rows.
- [x] **Race.** Two concurrent cancels of the same filled shift give exactly one `200` and one `409`, one `Cancellation` row and one `shift_cancelled` event. This is proven against the dev database, never with mocks.
- [x] **No timing rule.** Either reason works on any filled shift, past or future (owner decision).
- [x] **Nurse UI.** Maria's My shifts row has "Cancel shift" (`shift-cancel-button`). The dialog shows the reason fixed to "In advance".
  - Confirming closes the dialog, and `notification-banner` reads "Assignment cancelled: … The shift is open again."
  - The shift leaves My shifts, appears in Available shifts, and stays there after a reload.
- [x] **Agency UI.** Each filled row has exactly one "Cancel shift" button (`shift-cancel-button`); open rows have none. The dialog names the assigned nurse and asks for a reason, "In advance" (preselected) or "No-show".
  - The confirm label follows the chosen reason ("Cancel assignment" or "Report no-show").
  - The banner reads "Assignment cancelled: …" or "No-show reported: …".
  - The row turns Open and Unassigned, and stays that way after a reload.
- [x] **UI states.**
  - While a cancel is pending, both dialog buttons and the close control are disabled, and Escape and backdrop clicks do nothing. This lasts until the refreshed list has rendered.
  - If the cancel fails, the dialog stays open, the server's message appears in a `role="alert"` `notification-banner` inside it, and the list behind it refreshes.
- [x] **Docs and checks.** The docs in step 7 are updated and `pnpm verify` passes. After the run, the dev branch holds only seeded rows: 3 `Shift` in their spec state, 2 `Credential`, 0 `AuditEvent` and 0 `Cancellation`.

Non-goals:

- Showing cancellation history in the UI (owner decision). The audit plan and the admin dashboard plan read it. Admin cancellation is available through the API only, because the admin page is still a placeholder.
- Assignment history and timesheets: the immutable assignment ID that ARCHITECTURE §5 mentions.
- Cancellation notes, free text, notifications, and penalties or reclaim limits for a nurse who didn't show up.
- Auditing `POST /api/shifts` (TD-15).

## Context

**Baseline.** `main` at `0980347`, plus uncommitted cancellation UI work:

- New: `src/features/shifts/components/reopen-shift-dialog.tsx` and `src/features/shifts/use-server-refresh.ts`, a `router.refresh()` that returns a promise which resolves once the refresh has rendered.
- Edited:
  - `marketplace.tsx`: the nurse cancel posts `{ reason: "advance" }`.
  - `my-shifts-table.tsx`: a "Cancel shift" column.
  - `shift-board.tsx` and `shifts-table.tsx`: "Report no-show" on filled rows, carrying `shift-cancel-button`.
  - `icons.tsx`: `InfoIcon`.
  - A note in DESIGN §7.

The route doesn't exist yet, so confirming currently gets `404`.

**Requirements.** The spec's route 5 ([../../ShiftPatch-Technical-Spec.md](../../ShiftPatch-Technical-Spec.md)):

- `reason` is `"no-show"` or `"advance"`;
- the response is the updated shift plus `cancellation: { reason, previousNurseId }`;
- `shift-cancel-button` is the "button to cancel a claimed shift".

Status stays `open | filled`; a cancellation is history, not a status ([../../decisions.md](../../decisions.md), 2026-10-17).

**Product.** [../../PRODUCT.md](../../PRODUCT.md):

- Journey C: choose a reason, see the consequence, then the shift reopens with its history kept.
- §7: the shift lifecycle, "Cancellation permissions: proposed assumptions", and no blanket past-date rejection.
- PR-08, PR-11, PR-13, PR-14.

**Architecture.** [../../../ARCHITECTURE.md](../../../ARCHITECTURE.md):

- §5: the `Cancellation` model.
- §6: the contract, and "cancellation returns an `open` shift".
- §7: the permission table.
- §8: "Cancellation" is one transaction that reopens the shift conditionally, keeps the previous nurse, and appends an audit event.

**Design.** [../../DESIGN.md](../../DESIGN.md) §7 (the in-progress cancellation note), §8 and §11 ("Cancellation: clearly identify the shift, show any applicable consequence, confirm success, and refresh affected counts").

**Next.js 16 reference.** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`: `params` is a Promise, typed with `RouteContext<"/api/shifts/[id]/cancel">`.

**Reuse, don't rebuild:**

| Need | Existing code |
| --- | --- |
| Guard, errors, body | `requireActor` (`features/auth/server/request-auth.ts`), `HttpError`/`errorResponse` (`shared/server/errors.ts`), `readJson` (`shared/server/http.ts`) |
| Transaction pattern | `claimShift` in `features/shifts/server/shift-service.ts`: conditional `updateMany`, `findUnique` to tell `404` from `409`, then `recordAuditEvent(tx, …)` |
| Serializer | `toShiftDTO` in `shift-presenter.ts` |
| Route shape | `src/app/api/shifts/[id]/claim/route.ts` |
| UI | `ReopenShiftDialog`, `useServerRefresh`, `apiFetch` |
| Tests | `tests/integration/claims.test.ts` (throwaway rows, seed check, `expectHttpError`, race loop); `e2e/claim-api.spec.ts`, `e2e/nurse-ui.spec.ts`, `e2e/agency-ui.spec.ts`; `e2e/support.ts` (`deleteOwnRows`) |

## Design

**Data model.** One migration, `cancellations`:

```prisma
enum CancellationReason {
  advance
  no_show
}

enum AuditAction {
  shift_claimed
  shift_cancelled
}

model Cancellation {
  id              String             @id @default(uuid())
  shiftId         String
  shift           Shift              @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  reason          CancellationReason
  previousNurseId String
  previousNurse   User               @relation("CancelledNurse", fields: [previousNurseId], references: [id])
  actorId         String
  actor           User               @relation("CancellationActor", fields: [actorId], references: [id])
  createdAt       DateTime           @default(now())

  @@index([shiftId, createdAt])
}
```

Add the back-relations to `Shift` and `User`.

- A Prisma enum value must be an identifier, so the database stores `no_show`. `shift-presenter.ts` maps it to the API's `"no-show"` in both directions; no other module knows the database spelling.
- A cancellation is deleted with its shift (`Cascade`). The app never deletes shifts, and the cascade lets test cleanup (`deleteOwnRows`, the integration `afterAll`) work unchanged.
- The two user foreign keys are `RESTRICT`, like `AuditEvent.actorId`.

**Types and input** (`types.ts`, `schemas.ts`):

- `CANCELLATION_REASONS = ["advance", "no-show"] as const`, `CancellationReason`, and `CancelledShiftDTO = ShiftDTO & { cancellation: { reason: CancellationReason; previousNurseId: string } }`.
- `cancelShiftSchema = z.object({ reason: z.enum(CANCELLATION_REASONS, 'Reason must be "advance" or "no-show".') })`. Unknown keys are stripped, so a `previousNurseId` or `claimedBy` in the body is ignored.

**Pure rules** (`shift-policy.ts`):

- `canRecordNoShow(actor)`: true for an agency that has an agency ID, and for the admin.
- `cancellationRefusal(actor, shift: { agencyId, status, claimedById })` returns `{ status: 403 | 409, message } | null` and checks in this order:
  1. Agency scope: `403` when an agency targets another agency's shift, or has no agency ID.
  2. An open shift: `409`.
  3. A nurse who isn't the claimer: `403`.

  The order means a nurse who cancels the same claim twice gets `409`, not a misleading `403`, and another agency gets `403` even on an open shift.

**Server** (`shift-service.ts`): `cancelShift(actor, shiftId, reason): Promise<CancelledShiftDTO>`.

1. If the reason is `"no-show"` and `canRecordNoShow` fails, throw `403`. This runs before any database read, like the role check in `claimShift`.
2. Inside `getPrisma().$transaction(async (tx) => …)`:
   1. `tx.shift.findUnique({ select: { agencyId, status, claimedById } })`. No row gives `404`.
   2. If `cancellationRefusal` returns a refusal, throw it as an `HttpError`.
   3. `tx.shift.updateMany({ where: { id, status: "filled", claimedById: previousNurseId }, data: { status: "open", claimedById: null } })`. A count of 0 gives `409` "Shift has no active assignment".
   4. `tx.cancellation.create(…)`, then `findUniqueOrThrow` with the agency included, then `recordAuditEvent(tx, { action: "shift_cancelled", resourceType: "shift", resourceId, metadata: { agencyId, reason, previousNurseId } })`.
   5. Return `toCancelledShiftDTO(row, { reason, previousNurseId })`.

   This is race-safe for the same reason the claim is: under READ COMMITTED, a second concurrent `UPDATE` waits for the first one's row lock, then re-checks `status = 'filled'` and matches zero rows. The existing status/`claimedById` CHECK constraint backs it up.

**Route.** `src/app/api/shifts/[id]/cancel/route.ts`, `POST`:

1. `requireActor`.
2. `cancelShiftSchema.parse(await readJson(request))`.
3. `await ctx.params`.
4. `cancelShift`, then `200` with `no-store`.

**Seed.** Before upserting the three spec shifts, `prisma/seed.ts` deletes their `Cancellation` rows, so re-seeding returns them to their trial-start state with no history. Audit rows are left alone.

**UI.**

- `ReopenShiftDialog` replaces `variant: "cancel" | "no-show"` with `mode: "nurse" | "agency"`, and `onConfirm` receives `(shift, reason)`.
  - Nurse mode keeps today's copy and the read-only "In advance" field.
  - Agency mode:
    - The title is "Cancel {nurse}'s assignment?".
    - A `fieldset` with the legend "Cancellation reason" holds two radios: "In advance" (preselected) and "No-show".
    - The description, the consequence ("{nurse} will be unassigned and the shift will reopen."), the confirm label and the pending label follow the chosen reason: "Cancel assignment" or "Cancelling…", "Report no-show" or "Reporting…".
  - The reason resets each time the dialog opens.
- `shifts-table.tsx`: `NoShowButton` becomes a single "Cancel shift" button on filled rows. It carries `shift-cancel-button` and an `aria-label` that names the role, the date and the nurse. Use the same button in the desktop table and on the mobile card. Each is rendered once per row, so each row has one match.
- `shift-board.tsx` and `marketplace.tsx`: post the chosen reason and build the success banner from it. If the request fails, call `refresh()` too, then rethrow, so the dialog shows the message over a fresh list.
- No admin UI.

## Steps and progress

- [x] **0. Baseline and branch.**
  - Ask the owner whether the uncommitted cancellation UI is finished. Don't commit work that is still in progress.
  - `git switch -c feat/shift-cancellation`.
  - On the uncommitted UI as it stands, run `pnpm lint`, `pnpm build`, `pnpm typecheck`, then `pnpm exec playwright test e2e/nurse-ui.spec.ts e2e/agency-ui.spec.ts`. Record the results, and fix only what blocks.
  - Commit it by context with the `contextual-commits` skill: the shared icon and refresh hook; the dialog and its wiring; the DESIGN note.
  - Confirm the key names in `.env.development`. Print the names only, never the values.
- [x] **1. Schema, migration, seed.**
  - Add the models and run `prisma migrate dev --create-only --name cancellations`. Read the SQL, then apply it with `pnpm db:migrate` (dev branch only).
  - Run `--create-only` once more. It must generate an empty migration; delete that.
  - Add the seed's delete step and run `pnpm db:seed` twice.
  - Restart any running `pnpm dev`, because it holds the old Prisma client.
- [x] **2. Types, schema, policy, presenter, with unit tests.**
  - `schemas.test.ts`: both reasons pass; a missing, empty or unknown reason gets the message; extra keys are stripped.
  - `shift-policy.test.ts`: `canRecordNoShow` for every role, and every branch of `cancellationRefusal`, including its order.
  - `shift-presenter.test.ts`: `toCancelledShiftDTO` has exactly ten keys, and maps `no_show` to `"no-show"`.
- [x] **3. `cancelShift` and integration tests.** New file `tests/integration/cancellations.test.ts`.
  - `tests/integration/shifts.test.ts` and `claims.test.ts` each carry their own copy of the seed check and `expectHttpError`. Move them to `tests/integration/support.ts` rather than adding a third copy.
  - Throwaway rows: two agencies, each with its user, and two nurses with valid credentials. The admin is the seeded `admin-1`. A helper creates a shift with `createShift` and fills it with `claimShift`.
  - Cases:
    - An agency no-show and an agency advance cancel: the DTO, the database row, one `Cancellation` row (reason, previous nurse, actor, a recent time) and the audit events.
    - A nurse's own advance cancel. The admin, both reasons, on either agency's shift.
    - Every refusal, in the acceptance order. Each leaves the shift unchanged and writes no rows.
    - Claim, cancel, claim again, cancel again: two `Cancellation` rows.
    - Race: an agency no-show and the nurse's advance cancel on one shift through `Promise.allSettled`, on five fresh shifts, with a 60 s timeout. Each time, exactly one call succeeds and the other gets `409`, there is one `Cancellation` row and one `shift_cancelled` row.
  - `afterAll` deletes the audit rows, then the shifts (their cancellations cascade), then the users and the agencies.
- [x] **4. Route and HTTP contract.** Add the route file and a new `e2e/cancel-api.spec.ts`. Throwaway shifts are posted as agency-a, dated in 2027-06, and claimed by Maria. The cases:
  - An agency-a no-show: `200`, `no-store`, the exact ten keys and the `cancellation` object, and `GET /api/shifts` shows the shift open. A second cancel gets `409`.
  - Maria's advance cancel gets `200`; Maria's no-show gets `403`.
  - agency-b on agency-a's shift gets `403`. The admin's no-show gets `200`.
  - Malformed JSON, a missing body and an unknown reason each get `400`. An unknown shift gets `404`, and no token gets `401`.
  - A reopened shift can be claimed again.

  Track every created ID for cleanup. Check that `deleteOwnRows` leaves no `Cancellation` rows behind.
- [x] **5. UI.** Make the dialog and board changes above. Extend the e2e specs, using throwaway shifts dated in 2027-07 that no other spec uses, and never a seeded shift:
  - `nurse-ui.spec.ts`: Maria cancels. The banner, the row moving from My shifts to Available shifts, and the reload.
  - `agency-ui.spec.ts`:
    - A filled row has exactly one `shift-cancel-button` and an open row has none.
    - An advance cancel and a no-show, each checking the radios, the confirm label, the banner, the row turning Open and Unassigned, and the reload.
  - Both specs:
    - Pending state: delay the route. The buttons are disabled and the label changes, and Escape does nothing.
    - Failure: cancel the shift through the API first. The dialog shows the `409` in its `role="alert"` banner, and the list refreshes.
- [x] **6. Manual check** on `pnpm dev`, following [../../VERIFICATION.md](../../VERIFICATION.md) "Manual and UI verification":
  - Look at both dialogs at 375 px and 1440 px.
  - Cancel using only the keyboard: Tab to the button, Enter, arrow keys between the radios, Enter to confirm. Focus returns to the page when the dialog closes.
  - Make one `curl` cancel with a Bearer token.
  - Use only a shift posted for the check. Afterwards, name the rows you are about to delete, then delete exactly those by ID.
- [x] **7. Docs.**
  - ARCHITECTURE:
    - The status line.
    - §3: the cancel route is implemented.
    - §5: `Cancellation` and `shift_cancelled`, and the seed note.
    - §6: the cancel route's statuses and their order.
    - §8: Cancellation as implemented.
    - §12: build step 4 is done.
  - DESIGN §7: replace the in-progress note with the final behavior: one button per row, the reason choice for agencies, and the failure refresh.
  - PRODUCT §7: "Either reason works on any filled shift, past or future (owner decision, 2026-10-17)."
  - `docs/decisions.md`: the owner decisions and agent defaults below.
  - VERIFICATION:
    - What `pnpm test` and `pnpm test:e2e` now prove.
    - After a run the dev branch holds 0 `Cancellation` rows.
    - Update the Limitations line.
  - The tech-debt tracker: update TD-1.
- [x] **8. Verify and hand off.**
  - Run `pnpm verify` and record its real output.
  - Check the dev branch's row counts.
  - Tick the criteria that pass, and write down the next action.
  - Commit by context.

## Decisions and discoveries

Owner decisions (2026-10-17, during planning):

- **Agencies get both reasons**, through one "Cancel shift" button per filled row whose dialog asks for the reason ("In advance" preselected). This keeps exactly one `shift-cancel-button` per row. Two buttons would have made `row.getByTestId("shift-cancel-button")` match twice and fail Playwright's strict mode.
- **No timing rule.** Either reason works on any filled shift, past or future.
- **History is stored, not shown.** The `Cancellation` row and the audit event are written now; the audit plan and the admin dashboard plan display them.

Agent proposals, not yet reviewed by the owner:

- **Check order and messages** are listed under Acceptance. A nurse's no-show is refused before any database read. A nurse cancelling twice gets `409`.
- **Data shape:**
  - A `Cancellation` table that cascades with its shift and restricts deleting its users.
  - The database stores `no_show`, mapped to `"no-show"` in the presenter.
  - One audit action, `shift_cancelled`, with the reason in its metadata.
- **The response carries only `{ reason, previousNurseId }`**, exactly as the spec shows.
- **The previous nurse may claim the shift again**, including after a no-show. No rule in the packet forbids it.
- **Re-seeding** deletes the seeded shifts' `Cancellation` rows and leaves audit rows alone.
- **Race safety** comes from a conditional `updateMany` keyed on the previous nurse, under READ COMMITTED, as in the claim.

Discoveries:

- 2026-10-17: the cancellation UI was being edited while this plan was written. The first `git status` showed 3 changed files, and a later one showed 8.
- 2026-10-17: Prisma 7's `migrate dev` does not regenerate the client, so `pnpm exec prisma generate` is needed after the migration, and the running `pnpm dev` (pid 7113) held the old client and had to be restarted before the e2e specs could pass.
- 2026-10-17: Playwright JSON-encodes a string `data` body even with `Content-Type: application/json`, so the malformed-JSON case sends `Buffer.from("{not json")`.
- 2026-10-17: the audit metadata `reason` uses the API spelling (`"no-show"`), so only the presenter knows the database spelling.
- 2026-10-17: the dev branch holds a fourth shift, `shift-0f568082-1f91-466a-9903-aafa905ef4fa` (agency-a, dated 2026-10-26, open). It was there before the first integration run finished and no spec in this repository creates that date, so it was not created by this plan's tests. It was left in place.
- 2026-10-17: under `fullyParallel`, tests must never cancel a seeded shift, including the spec's own no-show example on `shift-2`, because other specs and the integration `beforeAll` require the seeded shifts' spec state.

## Verification

Actual results, 2026-10-17:

- Baseline on the uncommitted UI: `pnpm lint`, `pnpm typecheck` and `pnpm build` clean; `playwright test e2e/nurse-ui.spec.ts e2e/agency-ui.spec.ts`: 13 passed. `.env.development` holds `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH` and `AUTH_JWT_SECRET`.
- Migration `20261018031038_cancellations` applied to the dev branch; a second `--create-only` produced an empty migration, which was deleted. `pnpm db:seed` ran twice.
- `pnpm exec vitest run tests/integration`: 4 files, 49 passed, including five rounds of the concurrent cancel race.
- `pnpm exec playwright test e2e/cancel-api.spec.ts e2e/claim-api.spec.ts e2e/shifts-api.spec.ts`: 26 passed.
- Manual check on `pnpm dev`: both dialogs screenshotted at 375 px and 1440 px and read; the agency flow (arrow keys between the radios, Tab to "Report no-show", Enter) and the nurse flow (Tab to "Cancel shift", Enter, Tab to "Cancel assignment", Enter) work with the keyboard alone, and focus lands on the page (`BODY`) after the dialog closes because the row's trigger is removed. One `curl` no-show with a Bearer token returned `200`, `cache-control: no-store` and the ten-key body. The shift posted for that check (`shift-b6d5e4bd-b93f-4d3e-a2a5-f7af501da896`) was deleted by ID with its 2 audit rows and 1 cascaded `Cancellation` row.
- `pnpm verify`: exit 0. `check:docs` passed, Vitest 13 files and 141 tests passed, Playwright 82 passed (lint, build and typecheck clean).
- Dev branch counts after `pnpm verify`: `Shift` 4, `Credential` 2, `AuditEvent` 0, `Cancellation` 0, `Agency` 2, `User` 5.

After `pnpm verify`, the owner approved deleting the stray fourth shift. It was deleted by ID (no audit or cancellation rows were attached), and the dev branch then held `Shift` 3, `Credential` 2, `AuditEvent` 0 and `Cancellation` 0. Every acceptance criterion passed.

## Handoff or outcome

Complete (2026-10-17). `POST /api/shifts/:id/cancel`, the `Cancellation` history with its `shift_cancelled` audit event, and both cancel dialogs are implemented, merged to `main`, and verified with `pnpm verify` (141 Vitest and 82 Playwright tests) plus a manual check.

Known gaps, by design: cancellation history is stored but not shown in any UI (the audit and admin dashboard plans display it), admin cancellation is reachable through the API only, and assignment history for timesheets (the immutable assignment ID) is not built.

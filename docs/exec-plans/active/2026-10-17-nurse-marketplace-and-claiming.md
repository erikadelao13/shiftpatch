# Nurse marketplace and claiming

Status: Active
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-17

## Goal and acceptance criteria

A nurse claims an open shift from the marketplace. The server checks the nurse's credential expiry first, the claim cannot produce two winners, and every successful claim is audited in the same transaction. Credential expiry moves from a hardcoded constant (TD-14) into the database, so the banner and the claim read the same data.

Acceptance:

- [ ] **Baseline committed.** The nurse UI that is uncommitted on `main` is committed on `feat/nurse-marketplace-claim`, in its own commits, before any claim work starts. The shift-listing plan is in `completed/`.
- [ ] **Successful claim.** When Maria (`nurse-1`) claims an open shift with `POST /api/shifts/:id/claim`, she gets `200` and a ShiftDTO with exactly the nine keys, `status: "filled"` and `claimedBy: "nurse-1"`. The claim persists, and it shows in `GET /api/shifts`, on the agency board and in Maria's My shifts. Any request body is ignored, because the nurse comes from the token.
- [ ] **Expired credential.** James (`nurse-2`) gets exactly `403 { "error": "Credential expired, cannot claim shift" }`. The shift doesn't change and no audit event is written.
- [ ] **Expiry boundary.** "Today" is injected in tests. On the day before the expiry date and on the expiry date, the claim succeeds. On the day after, it gets the 403. At runtime, "today" is the UTC calendar date.
- [ ] **Missing credential.** A nurse with no `Credential` row gets `403 { "error": "No credential on file, cannot claim shift" }`.
- [ ] **Other errors.** An agency or the admin gets `403 "Only nurses can claim shifts"`. An unknown shift gets `404 "Shift not found"`. A filled shift gets `409 "Shift is no longer available"`. A request without authentication gets `401`. Every error is `{ error }`, and every response sets `Cache-Control: no-store`.
- [ ] **Race.** Two concurrent valid claims on the same open shift give exactly one success and one `409`, one assigned nurse and one audit event. Proven against the dev database, never with mocks.
- [ ] **Audit.** Each successful claim writes one `AuditEvent` (actor, `shift_claimed`, resource `shift` plus its ID, the time, and `{ agencyId }`) in the same transaction as the shift update. A rejected claim writes nothing.
- [ ] **Credential table.** A `Credential` model and its migration exist. `pnpm db:seed` loads exactly `nurse-1` → 2027-01-01 and `nurse-2` → 2026-06-01, and running it twice gives the same result. The `SEEDED_EXPIRIES` constant is gone, and TD-14 is closed.
- [ ] **Marketplace UI.** Exercised through the test IDs:
  - Maria clicks `shift-claim-button`. `notification-banner` starts with "Shift claimed", and the shift moves from Available shifts to My shifts and is still there after a reload.
  - James clicks it. The banner shows the exact expired message, and the shift is still open after a reload.
  - When someone else claimed the shift first, the banner says "Shift is no longer available" and the refreshed list no longer shows that shift.
  - Claim buttons stay disabled until both the claim and the refresh that follows it have finished.
- [ ] **Docs and checks.** The docs in step 7 are updated and `pnpm verify` passes. After the run, the dev branch holds only seeded rows: 3 `Shift` rows in their spec state, 2 `Credential` rows and 0 `AuditEvent` rows.

Non-goals:

- Cancellation and no-show (`POST /api/shifts/:id/cancel`, `shift-cancel-button`). That's the next plan.
- Credential upload: private Blob storage, the credential view, `credential-upload-input`, PR-09. It gets its own plan. `Credential` has no file columns yet.
- The admin audit view and `GET /api/admin/audit`, and auditing `POST /api/shifts`. Both belong to the audit plan.
- Assignment history and timesheets.
- A configurable facility time zone.

## Context

**Baseline.** `main` at `15cb055`, plus uncommitted nurse UI work:

- Moved: `src/app/(workspace)/(standard)/nurse/page.tsx` → `src/app/(workspace)/nurse/page.tsx`.
- New: `nurse/layout.tsx` (the sidebar shell); `src/features/credentials/` (`status.ts` and its test, `server/credential-service.ts` with the constant, `components/credential-banner.tsx`); and in `src/features/shifts/components/`, `marketplace.tsx`, `open-shifts-table.tsx` and `my-shifts-table.tsx`, plus `e2e/nurse-ui.spec.ts`.
- Edited: `getNurseMarketplace` in `shift-service.ts`, the `MarketplaceShift` and `NurseMarketplace` types, `formatEndsOn` in `schedule.ts`, two icons, and notes in ARCHITECTURE, DESIGN and the tech-debt tracker (TD-14).

The marketplace already posts to `POST /api/shifts/:id/claim`, shows the server's message in `notification-banner`, keeps the claim button enabled for James, and calls `router.refresh()` afterwards. The route doesn't exist yet.

`docs/exec-plans/completed/2026-10-17-shift-listing-and-posting.md` was moved from `active/` in step 0; it had still read "Complete, pending owner review (uncommitted)" after `15cb055` committed it.

**Requirements.** The spec ([../../ShiftPatch-Technical-Spec.md](../../ShiftPatch-Technical-Spec.md)) route 4: an empty body, the nurse identified by the token, the nine-key DTO, and the exact 403 message. The banner's success and error messages share one test ID and are told apart by their content.

**Product.** [../../PRODUCT.md](../../PRODUCT.md): Journey B; PR-05, PR-06, PR-07, PR-11, PR-13 and PR-14; §7 "Credentials and time" (expiry is inclusive of its date; historical shifts stay claimable).

**Architecture.** [../../../ARCHITECTURE.md](../../../ARCHITECTURE.md):

- §3: the dependency rules. Cross-feature calls go through named service functions.
- §5: the Credential and AuditEvent models, and the seed invariants.
- §6: error semantics.
- §7: "Claim a shift: Self, valid expiry".
- §8: claim steps 1–6. The update must be a real conditional write.

**Design.** [../../DESIGN.md](../../DESIGN.md) §7 (the note on the nurse marketplace), §8 and §11.

**Next.js 16 references.** Read these first:

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`: `params` is a Promise, typed with `RouteContext<'/api/shifts/[id]/claim'>`.
- `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`, "Fix synchronous IO". `todayIsoDate()` calls `new Date()`. On the nurse page it runs after `requireRole` has read cookies, inside `<Suspense>`. If `pnpm build` objects anyway, call `await connection()` before it.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`: `router.refresh()` keeps client state.

**Reuse, don't rebuild:**

| Need | Existing code |
| --- | --- |
| Request guard and page check | `requireActor` in `src/features/auth/server/request-auth.ts`; `requireRole("nurse")` in `current-user.ts` |
| Errors | `HttpError` and `errorResponse` in `src/shared/server/errors.ts` (`409` is already in `ErrorStatus`) |
| Serializer | `toShiftDTO` in `src/features/shifts/server/shift-presenter.ts` |
| Expiry rule | `getCredentialStatus` and `todayIsoDate` in `src/features/credentials/status.ts`, already tested at the boundary |
| Client | `apiFetch` in `src/shared/client/api-client.ts`; the claim handler already in `marketplace.tsx` |
| Seed | `prisma/fixtures.ts`, `prisma/seed.ts` (upsert, dev-branch guard) |
| Tests | `tests/integration/shifts.test.ts` (throwaway agency, seed check in `beforeAll`); `e2e/support.ts` (`deleteOwnRows`, `sessionIdOf`); `e2e/shifts-api.spec.ts` (HTTP contracts) |

## Design

**Data model.** One migration, `credentials_and_audit`:

```prisma
enum AuditAction { shift_claimed }

model Credential {
  id        String   @id @default(uuid())
  nurseId   String   @unique
  nurse     User     @relation(fields: [nurseId], references: [id], onDelete: Cascade)
  expiresOn DateTime @db.Date
  updatedAt DateTime @updatedAt
}

model AuditEvent {
  id           String      @id @default(uuid())
  actorId      String
  actor        User        @relation(fields: [actorId], references: [id])
  action       AuditAction
  resourceType String
  resourceId   String
  metadata     Json?
  createdAt    DateTime    @default(now())

  @@index([createdAt])
  @@index([resourceType, resourceId])
}
```

Add the back-relations to `User`.

- `Credential` holds one row per nurse: their current eligibility. The upload plan will add the file columns and update that row in place.
- An audit row points at its resource by type and ID, with no foreign key. That way history outlives the resource, and tests can delete their throwaway shifts.

**Pure rules** (`src/features/shifts/server/shift-policy.ts`):

- `canClaimShift(actor)`: the actor is a nurse.
- `credentialClaimError(status: CredentialStatus): string | null`: `valid` gives `null`, `expired` gives the spec message, and `missing` gives "No credential on file, cannot claim shift".

**Server:**

- `credentials/server/credential-service.ts`: `getCredentialExpiry(nurseId, db = getPrisma())` reads `Credential.expiresOn` and returns `YYYY-MM-DD` or `null`. `db` also accepts a transaction client, so the claim can read it inside its own transaction. Delete the constant and its comment.
- `audit/server/audit-service.ts` (new): `recordAuditEvent(tx, event)`. It accepts only a transaction client, so an audit row can't be written outside the business change it records.
- `shifts/server/shift-service.ts`: `claimShift(actor, shiftId, today = todayIsoDate())`.
  1. If `canClaimShift` fails, throw `403`.
  2. `getPrisma().$transaction(async (tx) => …)`:
     1. Read the credential through `tx` and pass it to `getCredentialStatus(…, today)`. If `credentialClaimError` returns a message, throw `403` with it.
     2. `tx.shift.updateMany({ where: { id, status: "open", claimedById: null }, data: { status: "filled", claimedById: actor.id } })`.
     3. If the count is 0: `tx.shift.findUnique` tells the cases apart. No row gives `404`; an existing row gives `409`.
     4. `findUniqueOrThrow` with the agency included, then `recordAuditEvent(tx, { actorId, action: "shift_claimed", resourceType: "shift", resourceId, metadata: { agencyId } })`.
     5. Return `toShiftDTO(row)`.

  Why this is race-safe: under Postgres READ COMMITTED, a second concurrent `UPDATE` waits for the first one's row lock. Once the first commits, the second re-checks `status = 'open'` and matches zero rows. That means no serializable retries are needed, and the existing status/`claimedById` CHECK constraint backs it up.
- `src/app/api/shifts/[id]/claim/route.ts`: `POST` calls `requireActor`, then `await ctx.params`, then `claimShift`, and returns `200` with `no-store`. It never reads the body.

**UI** (`marketplace.tsx`, `open-shifts-table.tsx`):

- Keep every claim button disabled while the refresh after a claim is still pending. Use `const [refreshing, startRefresh] = useTransition()` and pass `disabled={claimingId !== null || refreshing}`. Without this, the claimed row flashes back as claimable.
- Keep the success copy ("Shift claimed: RN on Oct 2, 2026 with Sunrise Health Staffing") and the server's error message as they are.

**Test cleanup.** `deleteOwnRows` in `e2e/support.ts` also deletes `AuditEvent` rows whose `resourceId` is in `shiftIds`, before it deletes the shifts.

## Steps and progress

- [ ] **0. Baseline and branch.**
  - `git switch -c feat/nurse-marketplace-claim`.
  - On the uncommitted UI as it stands, run `pnpm lint`, `pnpm build`, `pnpm typecheck`, `pnpm vitest run src/features/credentials src/features/shifts` and `pnpm exec playwright test e2e/nurse-ui.spec.ts`. Record the results. Fix only what blocks, such as the `new Date()` prerender.
  - Commit it by context with the `contextual-commits` skill: credential status and banner; the nurse shell and marketplace; its e2e spec; its docs.
  - Move the shift-listing plan to `completed/`, set its status to `Complete`, repair the links and run `pnpm check:docs`. Commit that separately.
  - Confirm the key names in `.env.development`. Print the names only, never the values.
- [ ] **1. Schema, migration, seed.**
  - Add the models and run `prisma migrate dev --create-only --name credentials_and_audit`. Read the SQL, then apply it with `pnpm db:migrate` (dev branch only).
  - Run `--create-only` once more. It must generate an empty migration; delete that.
  - Add `fixtureCredentials` to `prisma/fixtures.ts`. The seed upserts them by `nurseId` and resets `expiresOn`, and its log line counts credentials too.
  - Run `pnpm db:seed` twice.
- [ ] **2. Credential service and policy.**
  - Replace the constant with the Prisma query.
  - Add `canClaimShift` and `credentialClaimError`, with their cases in `shift-policy.test.ts`.
  - Close TD-14.
- [ ] **3. Audit service, `claimShift` and integration tests.** New file `tests/integration/claims.test.ts`:
  - `beforeAll` fails with "Run `pnpm db:seed`" unless the 3 shifts and the 2 credentials are in their spec state.
  - Create throwaway rows: an agency and its user, plus nurses whose credential is valid, expired, on a boundary date, or missing. Create their open shifts with `createShift`.
  - Successful claim: the DTO, the database row, and exactly one audit event with the right fields.
  - Boundary with `today` injected: the day before, the expiry date and the day after.
  - Expired: the exact message, the shift unchanged, zero audit rows. Run James against the seeded `shift-1` too, which only reads it.
  - The missing credential `403`, the agency and admin `403`, the unknown shift `404`, and the filled shift `409`.
  - Race: two valid nurses claim one shift through `Promise.allSettled`, on several fresh shifts. Each time, exactly one call succeeds and the other gets `409`, `claimedById` is the winner, and there is exactly one audit row.
  - `afterAll` deletes the audit rows, then the shifts, the users (whose credentials cascade) and the agency.
  - If an interactive transaction fails over Neon's pooled `DATABASE_URL`, stop and record the error. Don't switch strategy silently.
- [ ] **4. Route and HTTP contract.** Add the route file and a new `e2e/claim-api.spec.ts`. The cases:
  - agency-a posts a throwaway shift with a Bearer token; Maria claims it and gets `200` with the exact DTO; a second claim gets `409`.
  - James on `shift-1` gets the exact 403 body, and `GET /api/shifts` shows `shift-1` unchanged.
  - The agency and admin `403`, the unknown-shift `404`, and `401` without a token.
  - Two parallel claims by Maria give the statuses `[200, 409]`.

  Track every created ID for cleanup.
- [ ] **5. UI.** Make the pending-state change above, then extend `e2e/nurse-ui.spec.ts`:
  - Maria claims a throwaway shift, with the outcome described under Acceptance.
  - James is rejected on `shift-1`.
  - The lost race: Maria opens the page, the same shift is claimed through the API with a second Maria session, and then she clicks it in the UI.

  The specs run `fullyParallel`, so:
  - Never claim a seeded shift.
  - Post throwaway shifts as agency-a, on dates no other test uses, so you can find their rows and the existing count-based assertion on the Metro filter still holds.
- [ ] **6. Manual check** on `pnpm dev`, following [../../VERIFICATION.md](../../VERIFICATION.md) "Manual and UI verification":
  - Look at Maria and James at 375 px and 1440 px.
  - Claim using only the keyboard.
  - Check that the banner is announced.
  - Make one claim with `curl` and a Bearer token.
  - A manual claim of a seeded shift changes it, so run `pnpm db:seed` afterwards.
- [ ] **7. Docs.**
  - ARCHITECTURE:
    - The status line.
    - §3: mark the claim route, `credentials/server` and `audit/server` as implemented.
    - §5: Credential and AuditEvent, and the seed invariants.
    - §6: the claim's error statuses.
    - §8: as implemented, with the check order and why READ COMMITTED is enough.
    - §12: build step 4, with claim done and cancel pending.
  - DESIGN §7: the claim works, and the pending state now covers the refresh. Remove "fails with a generic error".
  - PRODUCT §7 and §14: "today" for expiry is the UTC calendar date (owner decision).
  - `docs/decisions.md`: the owner decisions and agent defaults below.
  - VERIFICATION:
    - What `pnpm test` and `pnpm test:e2e` now prove.
    - After a run the dev branch holds 3 `Shift`, 2 `Credential` and 0 `AuditEvent` rows.
    - Update the Limitations line.
  - The tech-debt tracker:
    - Close TD-14.
    - Update TD-1.
    - Add: `POST /api/shifts` isn't audited until the audit plan (PR-11).
- [ ] **8. Verify and hand off.**
  - Run `pnpm verify` and record its real output.
  - Check the dev branch's row counts.
  - Tick the criteria that pass.
  - Write down the next action. Commit the plan's work by context only when the owner asks.

## Decisions and discoveries

Owner decisions (2026-10-17, during planning):

- **Credentials.** A `Credential` table, seeded with the spec's expiries. The banner and the claim both read it. Upload has its own plan later.
- **Audit.** Add the `AuditEvent` table now. This plan audits only claims, inside the claim transaction. Auditing posts and building the admin view come in the audit plan.
- **"Today" for expiry is the UTC calendar date.** A credential stays valid through its expiry date.
- **The uncommitted nurse UI is committed first** on a feature branch, and the finished shift-listing plan moves to `completed/`.

Agent proposals, not yet reviewed by the owner:

- **Check order:** role, then credential, then whether the shift exists, then whether it's available. As a result, James gets the credential 403 even for an unknown or filled shift.
- **Messages:** "Only nurses can claim shifts" (403), "No credential on file, cannot claim shift" (403), "Shift not found" (404) and "Shift is no longer available" (409). The 409 also covers the nurse's own claimed shift.
- **Race safety** comes from a conditional `updateMany` under READ COMMITTED, with no serializable isolation or retries.
- **Data shape:** one `Credential` row per nurse. Audit rows reference their resource by type and ID, with no foreign key.
- **Re-seeding** resets both nurses' expiry dates to the spec values.

Discoveries:

- 2026-10-17: the shift-listing plan is stale. `15cb055` committed it, but it never moved to `completed/`.
- 2026-10-17: under `fullyParallel`, claim tests must never touch seeded shifts, because other specs and the integration `beforeAll` require their spec state.

## Verification

Nothing has run yet.

## Handoff or outcome

Next action: step 0. Create the branch, check the uncommitted UI, and commit it by context.

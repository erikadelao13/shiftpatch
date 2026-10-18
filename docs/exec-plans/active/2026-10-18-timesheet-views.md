# Lightweight timesheet views

Status: Active
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-18

## Goal and acceptance criteria

PR-12 holds for every role. A real assignment view shows planned work and the recorded-work state, never fabricated hours. The view is scoped by ARCHITECTURE §7 ("Read timesheets": nurse sees their own assignments, an agency its own, the admin all of them). It keeps cancelled and no-show assignments as history, per PRODUCT §7: "Retain historical assignment context after cancellation or reassignment".

Acceptance:

1. **One table per role, server-scoped.**
   - `/nurse/timesheets`, `/agency/timesheets` and `/admin/timesheets` each render exactly one `<table data-testid="timesheet-table">`, filled by `listTimesheetEntries(scope)`.
   - Each page authorizes with `requireRole`. A nurse who opens the agency or admin page is redirected away.
   - Agency B never sees agency A's rows.
2. **History rows.**
   - Every `Cancellation` row is listed as a history row: a "Cancelled" or "No-show" pill and the previous nurse's name.
   - History rows never count toward the assigned count or the scheduled hours.
   - Claim → cancel → reclaim of one shift gives one Cancelled row and one Assigned row.
   - Worked hours read "Not recorded" on every row.
3. **Cards and footer.**
   - The three cards are Assigned shifts, Scheduled hours, and "Cancelled or no-show" (note: "Not counted in scheduled hours"). The last one replaces "Recorded work hours".
   - The cards and the footer agree with the table rows.
4. **Navigation.**
   - The agency sidebar uses `SidebarNav` with Overview and Timesheets.
   - The admin sidebar gains Timesheets between "Shift overview" and "Audit log".
   - `aria-current` is right on every page.
5. **Nothing new in the data layer.** No migration, no `Timesheet` model and no `/api/timesheets` route. The nurse page stops calling `getNurseMarketplace`.
6. **Tests pass.** The unit, integration and e2e tests below pass. After a run, the dev branch holds exactly 3 `Shift`, 2 `Credential`, 0 `CredentialDocument`, 0 `AuditEvent` and 0 `Cancellation` rows.
7. **Docs match.** ARCHITECTURE, PRODUCT (annotated), DESIGN, VERIFICATION, decisions and the tech-debt tracker match the result, and `pnpm verify` passes.

Non-goals: hours entry, submission, approval, payroll; an admin agency filter; paging or a date range; component (Testing Library) tests; deployment.

## Not needed (owner-confirmed 2026-10-18)

| Item the docs listed as pending | Why it is dropped |
| --- | --- |
| `Timesheet` table (submission-state enum, nullable actual hours) | Hours entry and submission are out of scope (PRODUCT §13), so every row would hold `null` hours and a fixed state forever. Assignments come from `Shift` and `Cancellation` instead. |
| `GET /api/timesheets` | It is not a spec route and nothing would consume it. The audit log set the precedent of a page only, authorized by `requireRole`. |
| An immutable assignment table (ARCHITECTURE §5) | That paragraph applies only when timesheets store data per claim. `Cancellation` rows already record each past assignment immutably. |
| "Recorded work hours" card | It could only ever show "—". It is replaced by the cancelled or no-show count. |
| `getNurseMarketplace` on the timesheet page | It fetched every open shift only to discard them. |

## Context

- **Already built and uncommitted on `main`:**
  - nurse UI: `src/app/(workspace)/nurse/timesheets/{page,error}.tsx`, `src/features/timesheets/components/{timesheet,timesheet-table}.tsx`, `src/features/timesheets/hours.ts` and `hours.test.ts`
  - `e2e/timesheets-ui.spec.ts`
  - the nurse sidebar item in `nurse/layout.tsx`
  - doc edits in ARCHITECTURE §9, DESIGN §7, VERIFICATION and TD-1
- **Data.**
  - A current assignment is a `Shift` with `status = filled` and a `claimedById`.
  - A past assignment is a `Cancellation` row: `reason` is `advance` or `no_show`, plus `previousNurseId` and `createdAt`. It cascades from `Shift`, and both of its user foreign keys are RESTRICT.
  - There is no claim timestamp.
- **Patterns to copy.**
  - Service and presenter: `src/features/audit/server/audit-service.ts` and `audit-presenter.ts`. The presenter is pure, and `tests/stubs/server-only.ts` lets unit tests import it.
  - Page: `admin/audit/page.tsx` and `error.tsx`.
  - Refresh when the tab becomes visible: `src/features/audit/components/audit-log.tsx:28`.
  - Card layout below `xl`: `audit-log-table.tsx`.
  - Integration setup and cleanup: `tests/integration/cancellations.test.ts`.
  - e2e helpers: `createNurse` and `deleteOwnRows` in `e2e/support.ts`.
- **Reuse:**
  - `durationHours`, `formatDate`, `formatEndsOn` (`src/features/shifts/schedule.ts`)
  - `formatHours` (`timesheets/hours.ts`)
  - `StatCard`, `useServerRefresh` (`features/shifts`)
  - `SidebarNav` (`src/shared/ui/sidebar-nav.tsx`, exact pathname match)
  - `NoteIcon`, `HomeIcon` (`src/shared/ui/icons.tsx`)

## Steps and progress

- [x] **0. Branch and baseline.**
  - Run `git switch -c feat/timesheets`.
  - Commit the existing UI and doc work by context (the `contextual-commits` skill) before any change.
  - Run `pnpm db:seed` if needed, and confirm the dev row counts in acceptance 6.
- [x] **1. Types and presenter.**
  - Create `src/features/timesheets/types.ts`, with no `server-only` so client components can import it. It defines:
    - `TimesheetEntryState = "assigned" | "cancelled" | "no-show"`
    - `TimesheetEntry = { id, shiftId, role, agencyName, date, startTime, endTime, nurseName, state }`. `id` is the shift ID for an assigned row and the cancellation ID for a history row; shift IDs start with `shift-`, so the two cannot collide.
  - Create `server/timesheet-presenter.ts` (`server-only`, pure):
    - It defines the `AssignmentRow` and `CancellationRow` input types.
    - `toTimesheetEntries(assignments, cancellations)` maps both lists, merges them and sorts them.
    - States come from `Record<DbCancellationReason, TimesheetEntryState>`, so the compiler flags a missed enum value.
    - Dates use `toISOString().slice(0, 10)`.
    - A filled shift with no nurse throws, so the page fails visibly through `error.tsx`.
  - **Order:** date, start time, the shift's `createdAt`, `shiftId`; then history rows before the assigned row, ordered by the cancellation's `createdAt`. A current claim always comes after every cancellation of its shift.
- [x] **2. Service.**
  - Create `server/timesheet-service.ts` (`server-only`):
    - `listTimesheetEntries(scope: { kind: "nurse"; nurseId } | { kind: "agency"; agencyId } | { kind: "all" })`
    - It runs two `findMany` calls in `Promise.all`:
      - filled `Shift` rows with `agency.name` and `claimedBy.name`
      - `Cancellation` rows with the same shift fields and `previousNurse.name`
    - Nested selects avoid N+1 queries. Annotate the results with the presenter's row types, so a drifting select fails typecheck.
  - The `where` clause per scope:
    - nurse: `claimedById` / `previousNurseId`
    - agency: `agencyId` / `shift.agencyId`
    - all: none
  - The service takes a scope, not an actor, like `getAgencyBoard` and `getAdminBoard`. Each page builds the scope from the user `requireRole` returns.
- [x] **3. Totals.**
  - In `hours.ts`, retype `ScheduledShift` against `TimesheetEntry`.
  - Add `timesheetTotals(entries) → { assigned, history, scheduledHours }`, counting only `assigned` rows toward `assigned` and `scheduledHours`.
- [x] **4. Components.**
  - **`Timesheet({ audience: Role, entries })`**
    - All copy comes from a `COPY` record keyed by audience. The nurse copy stays as it is. Proposed agency copy: "Every assignment, accounted for." / "Review scheduled time for your agency's shifts." / "No nurse has claimed one of your shifts yet." Proposed admin copy: "Hours across every agency." / "Review assignments and scheduled time for both agencies." / "No shifts have been claimed yet." Neither empty state has a link.
    - The empty state shows only when there are no entries at all.
    - The third card is "Cancelled or no-show".
    - Footer: "{n} assigned shift(s)", then " · {m} cancelled or no-show" when m > 0, then "Total scheduled: {h}".
    - The bottom note becomes: "Cancelled and no-show rows stay listed as history and are not counted in the totals."
    - Refresh: the button for every audience, and also refresh on tab return for the admin only. The effect returns early for other audiences, so hook order stays the same.
  - **`TimesheetTable({ entries, showAgency, showNurse })`**
    - Columns: the nurse view is unchanged. The agency view swaps Agency for Nurse. The admin view shows Shift, Agency, Nurse, Date, Scheduled time, Scheduled hours and Worked hours.
    - The admin table (7 columns) stacks into cards below `xl`, like the audit table; nurse and agency stack below `md`.
    - Write both breakpoint class sets as literal strings in one map. Tailwind v4 cannot see interpolated class names.
    - Add an `EntryStatePill`: Assigned uses `success-*`, Cancelled `neutral-*`, No-show `danger-*`.
    - History rows show the duration muted and not bold, with "Not counted" under it.
- [x] **5. Pages and layouts.**
  - `nurse/timesheets/page.tsx`: use the `{ kind: "nurse", nurseId: user.id }` scope.
  - New `admin/timesheets/{page,error}.tsx`, copying the audit page. The error reads "We couldn't load the timesheets."
  - New `agency/timesheets/{page,error}.tsx`. When the user has no `agencyId`, render "This account has no agency.", as `agency/page.tsx` does.
  - `admin/layout.tsx`: add the Timesheets item with `NoteIcon`.
  - `agency/layout.tsx`: replace the hand-written `<nav>` with `SidebarNav label="Agency"`, listing Overview (`HomeIcon`) and Timesheets (`NoteIcon`), and drop the `Link` import.
  - Restart any reused `pnpm dev` after adding the route folders.
- [x] **6. Tests.**
  - **Unit** `server/timesheet-presenter.test.ts`, plus additions to `hours.test.ts`:
    - field mapping and the date conversion, building dates with `new Date("2026-10-03")`, never with local constructors
    - `advance` maps to "cancelled" and `no_show` to "no-show"
    - a history row takes its `id` from the cancellation and its fields from the shift
    - every ordering tie-break
    - the throw on a filled shift with no nurse
    - `timesheetTotals` leaves out history, and an empty list gives zeros
  - **Integration** `tests/integration/timesheets.test.ts`
    - Copy the setup from `cancellations.test.ts`: `assertSeededState`, two throwaway agencies with their users, and two nurses with credentials that expire in 2030. Create the data through the real `createShift`, `claimShift` and `cancelShift`.
    - Cases:
      1. Claim → cancel → reclaim gives exactly `[cancelled (cancellation id), assigned (shift id)]`.
      2. No-show, then nurse two claims: nurse one sees only the "no-show" row and nurse two sees only the assigned row. This proves history follows `previousNurseId`.
      3. Each agency scope excludes the other agency's rows.
      4. Schedule order for shifts posted out of order.
      5. The `all` scope includes seeded `shift-2` as Maria Lopez, assigned, plus both throwaway agencies' rows. Filter by our own IDs.
      6. An open shift with no history yields nothing.
    - Clean up in this order: audit rows (by actor or resource) → shifts, which cascades to cancellations → users → agencies.
  - **e2e**, extending `e2e/timesheets-ui.spec.ts`
    - Add a helper that creates a throwaway nurse. On agency-a's shift A that nurse claims, cancels in advance and claims again. On shift B the nurse claims and agency-a records a no-show. Use dates in 2035, which no other spec uses, and track every ID for cleanup.
    - Cases:
      1. **Nurse.** Three rows (A Cancelled, A Assigned, B No-show), history rows showing "Not counted", cards at 1 / 12h / 2, and a footer with "1 assigned shift", "2 cancelled or no-show" and "Total scheduled: 12h".
      2. **Agency.** Agency-a navigates from Overview to Timesheets, and `aria-current` moves with it. Its rows show "Throwaway Nurse". The Assigned card equals the number of rows with the "Assigned" pill in the same render. Agency-b sees none of the 2035 rows.
      3. **Admin.** Navigate through the "Administration" nav and check `aria-current`. The page has one table, the Agency and Nurse columns, and the same card-to-row agreement.
      4. **Redirects.** Maria is redirected away from `/admin/timesheets` and from `/agency/timesheets`.
      5. **Admin layout.** At 375px there is no page-wide horizontal scroll. At 1280px the header row shows and the table is not wider than its panel, which catches clipping.
    - Update the existing "Recorded work hours" assertion. `deleteOwnRows` needs no change.
- [x] **7. Docs.**
  - **ARCHITECTURE:**
    - the status line
    - the §3 tree: remove `api/timesheets/route.ts`, add the three page folders and the timesheet `types.ts` and `server/*`, and reword the `shift-presenter` "only place that maps `no_show`" claim to "the API spelling"
    - §4: the state-ownership row ("timesheets" and "audit rows" become Server Component props refreshed with `useServerRefresh`)
    - the §5 Timesheet row: no table, derived from the data; then rewrite the immutable-assignment paragraph
    - §9 Timesheets
  - **PRODUCT:** add a dated note under §7 Timesheets. It says the owner decided on 2026-10-18 against a table or API; that the submission state shows as "Not recorded" because nothing can be submitted; and that cancelled and no-show assignments are listed as history. Leave the PR-12 and §4/§6/§14 wording, and point to the note.
  - **DESIGN §7:**
    - update the nurse paragraph: history rows, pills, the third card, footer and note
    - add a paragraph for agency and admin: navigation, copy, columns, the admin `xl` stacking, admin refresh on tab return, no filter
    - remove Timesheets from the "Omitted" list
    - record the card deviation from the mockup
  - **VERIFICATION:** the `pnpm test` and `pnpm test:e2e` rows, and the Limitations bullet.
  - **Tech-debt tracker:** reword TD-1, and add an entry for the unpaged, unbounded admin and agency list.
  - **`docs/decisions.md`:** add "### 2026-10-18: timesheet decisions" with the four owner decisions and the agent defaults below.
  - Run `pnpm check:docs`.
- [ ] **8. Verify and hand off.** (`pnpm verify` passed; the manual look and the row-count check are open, see Verification.)
  - Run `pnpm verify`. Look at all three pages by hand at 375, 768, 1024 and 1280px, using only the keyboard.
  - Re-check the dev row counts.
  - Record the actual output here, then move this plan to `completed/`.

## Decisions and discoveries

Owner decisions (2026-10-18, while planning):

- Build the agency (own agency) and admin (all) views, reusing the nurse table with a Nurse column.
- Cancelled and no-show assignments are history rows taken from `Cancellation`, excluded from the totals, with no migration.
- No `Timesheet` table and no `GET /api/timesheets`.
- Replace the "Recorded work hours" card with a "Cancelled or no-show" count, recorded in DESIGN as a deviation from the mockup.

Agent defaults, not yet reviewed by the owner:

- One `listTimesheetEntries(scope)` function rather than one per role. Pages authorize, as on the admin overview.
- The ordering rule in step 1. Entries are keyed by shift ID or cancellation ID.
- Pill colors: neutral for Cancelled and danger for No-show.
- The agency and admin copy in step 4.
- The admin page refreshes on tab return, as the overview and the audit log do. Nurse and agency pages do not.
- No admin agency filter. The admin table stacks below `xl`.

Traps to keep in mind:

- Shared accounts (Maria, agency-a, agency-b, the admin) pick up rows from parallel specs; the `admin-ui` audit test, for example, leaves Maria a no-show on 2027-04-05. Assert exact totals only for a throwaway nurse. For shared accounts, check that the cards agree with the rows in the same render.
- `createNurse` always names the nurse "Throwaway Nurse", and shift A has two rows on the same date. Scope locators by date plus pill to avoid strict-mode violations.
- Never cancel seeded `shift-2`: it breaks `assertSeededState` for every spec.
- `<Activity>` keeps the previous page mounted but hidden. `toHaveCount` counts hidden nodes, while `getByRole` skips them.
- `pnpm typecheck` needs a prior `pnpm build`, which generates the route types.
- The e2e redirect checks exercise only the optimistic proxy. `requireRole` is the server-side guarantee.

## Verification

- `pnpm verify` passed on 2026-10-18: `check:docs`, `lint`, `build`, `typecheck`, `test` and `test:e2e` (110 e2e tests, including the 8 in `e2e/timesheets-ui.spec.ts`).
- `tests/integration/timesheets.test.ts`: 6 passed. Unit: `timesheet-presenter.test.ts` and `hours.test.ts`, 13 passed.
- **Acceptance 6 is not met.** After the run the dev branch holds 5 `Shift`, 2 `Credential`, 0 `CredentialDocument`, 6 `AuditEvent` and 2 `Cancellation` rows. The extra rows are two agency-a shifts dated 2026-10-23 (`shift-a3ea67d5-…`, `shift-5501b272-…`), their audit events and two cancellations by `nurse-1`. They were created minutes apart, not by an automated spec, so they look like manual use and were left in place. Deleting them needs the owner's go-ahead.
- Not done: the by-hand look at the three pages at 375, 768, 1024 and 1280px with the keyboard only.

## Handoff or outcome

Next action: the owner decides whether to delete the leftover 2026-10-23 rows. Then recheck the row counts, do the manual look, and move this plan to `completed/`.

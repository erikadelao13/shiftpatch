# Admin shift overview

Status: Completed
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-18

## Goal and acceptance criteria

The administrator opens `/admin` and sees every shift across both agencies: current status, assigned nurse, and coverage totals that agree with the table. The page follows the approved mockup (`ShiftPatch admin shift overview.png`, supplied 2026-10-18 and described under Context). It replaces the placeholder and delivers the spec's `admin-dashboard-shift-table` and `admin-shift-status-badge` (PRODUCT Journey E, PR-10).

Acceptance:

- [x] **Shell.** `/admin` uses the shared sidebar shell, like the agency and nurse workspaces.
  - Workspace label "Administration".
  - One nav item, "Shift overview" (grid icon, `aria-current="page"`).
  - Account block "Alex Kim / Administrator" with the sign-out icon.
  - The header-only `(standard)` layout no longer exists.
- [x] **Header.**
  - Breadcrumb "Workspace / Administration".
  - `h1` "Every shift, in view.", with "Track coverage and assignments across both agencies." below it.
  - A secondary "Refresh" button with a refresh icon on the right.
- [x] **Data.** Every shift in the database, from all agencies, in schedule order (date, start time, created). A Server Component reads them behind `requireRole("admin")` inside `<Suspense>`. No new API route.
- [x] **Summary cards.** Open shifts, Filled shifts, Coverage and Hours scheduled.
  - Coverage shows a percentage and a meter, or "—" with a note when there are no shifts.
  - All four come from `summarize()` over the shifts in the current agency filter.
- [x] **Shift panel.**
  - Heading "Shift overview", with "All agencies, one clear view." below it.
  - An "All agencies" select on the right. Its options come from the `Agency` table, sorted by name.
  - Tabs "All shifts (n)", "Open (n)" and "Filled (n)", with arrow-key movement.
  - Table columns:
    - **Shift:** role, with the shift ID as secondary text.
    - **Agency.**
    - **Date & time:** the date, then the time range with "(+1 day)" for overnight shifts.
    - **Assigned nurse:** initials avatar and name, or "Unassigned".
    - **Status:** badge.
  - Footer: "Showing N shifts" on the left, "Facility-local time" on the right.
  - There is **no** "All statuses" dropdown (owner decision).
- [x] **Test IDs.**
  - `admin-dashboard-shift-table` is on the one real `<table>`.
  - Each row has exactly one `admin-shift-status-badge`, on the badge that reads "Open" or "Filled".
  - Both exist once in the DOM at every width: a single table that stacks into cards below `md`, like `OpenShiftsTable`.
- [x] **Totals agree** (PR-10). The cards, the tab counts and "Showing N shifts" are all computed from the same agency-filtered list:
  - the Open card equals the Open tab count;
  - the Filled card equals the Filled tab count;
  - the All tab count equals the rows shown and "Showing N".
- [x] **Empty states.**
  - No shifts at all: "No shifts posted yet." in the table, and Coverage "—" with that note.
  - Filters leave nothing: "No shifts match these filters." with a "Clear filters" button that resets the agency and the tab.
- [x] **Refresh.**
  - The button re-renders the server data through `useServerRefresh`. While pending it is disabled and reads "Refreshing…". Afterwards a polite visually hidden status says "Shift overview refreshed."
  - The page also refreshes, with no announcement, when the browser tab becomes visible again. There is no timer.
  - The agency filter and tab survive a refresh. A selected agency that no longer exists falls back to All agencies.
- [x] **Failure.** If the data fails to load, the page shows an inline error with "Try again" (an `error.tsx` that uses `retry()`), never an empty table.
- [x] **Banner.** Full-width sage banner with the shield icon: "Clear status. Accurate coverage." and "Cancelling an assignment reopens the shift and removes the assigned nurse."
- [x] **No regressions.** The agency board and the nurse marketplace behave the same after the shared pieces are extracted. `e2e/agency-ui.spec.ts` and `e2e/nurse-ui.spec.ts` pass unchanged.
- [x] **Docs and checks.**
  - `pnpm verify` passes.
  - The dev branch holds only the seeded rows afterwards.
  - PRODUCT, ARCHITECTURE, DESIGN, decisions, VERIFICATION and the tech-debt tracker describe the new behavior.

Non-goals:

- An admin cancel or no-show action. The mockup has no action column; the API still allows it (`e2e/cancel-api.spec.ts`).
- Cancellation history ("Reopened after no-show") on the overview. The audit log plan shows it.
- The audit log (`audit-log-table`) and timesheets (`timesheet-table`). Each gets its own plan and adds its own nav item.
- A new API route, TanStack Query, interval polling or push updates.
- Date-range filters, search, pagination, and Rate or Details columns.
- Component tests with Testing Library (TD-1) and loading skeletons. The page keeps the "Loading…" fallback the other workspaces use.

## Context

**Baseline.** `main` is clean at `288bbe3`. `/admin` is `src/app/(workspace)/(standard)/admin/page.tsx`: `requireRole("admin")`, then "Welcome, {name}" and "Coverage reporting will live here". It is the only route left in the `(standard)` group, whose `layout.tsx` is a header with `signed-in-user` and the sign-out button. The agency and nurse workspaces already use `Sidebar`.

**Requirements.**
- Spec test IDs, `docs/ShiftPatch-Technical-Spec.md` L227-228.
- PRODUCT §5 Journey E, PR-10 and §11 ("Refresh relevant views … when returning to an active workspace").
- DESIGN §7 (KPI cards, tabs, table), §9 (admin focus), §10 (stacked cards below `md`), §11 (empty, filtered-empty and fetch-failure states).
- decisions.md, 2026-10-17: status is `open | filled`, and the badge has no Cancelled state.

**Mockup** (the source of truth for layout and copy):
- Sidebar: logo; "WORKSPACE" / "Administration"; active "Shift overview"; Alex Kim / Administrator; sign-out icon.
- Main area: the header as above, and four cards with no notes. With the seed data they read 2, 1, 33% with a bar, and 12h.
- Panel: the "Shift overview" heading and subtitle on the left, the filter on the right, the tabs, the table and the footer.
- The sage banner sits below the panel.
- The seeded rows read:
  - "RN / shift-1, Sunrise Health Staffing, Oct 2, 2026, 19:00–07:00 (+1 day), Unassigned, Open"
  - "LPN / shift-2 … Maria Lopez, Filled"
  - "RN / shift-3, Metro Care Partners … Open"

**Next.js 16 reference.**
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`: `error.tsx` receives `{ error, retry }`. `retry` has been stable since 16.3 and re-fetches and re-renders the segment.
- `.../04-functions/use-router.md`: `router.refresh()` re-renders Server Components and keeps client state.
- `cacheComponents` is on, so every session or database read stays inside `<Suspense>`.

**Reuse, don't rebuild.**

| Need | Existing code |
| --- | --- |
| Sidebar shell | `Sidebar` in `src/shared/ui/sidebar.tsx`; layout pattern in `src/app/(workspace)/agency/layout.tsx` |
| Nav icon | `GridIcon` in `src/shared/ui/icons.tsx` (add a `RefreshIcon` beside it) |
| Counts, coverage, hours | `summarize`, `formatDate`, `formatTimeRange` in `src/features/shifts/schedule.ts` (typed on `AgencyShift` fields, so a wider row type fits) |
| Cards, badge, nurse cell | `StatCard`, `StatusBadge`, `AssignedNurse` in `src/features/shifts/components/` |
| KPI grid and status tabs | Inline in `shift-board.tsx` (KPI grid L142-165, tabs L37-43, L85-93, L178-202): extract |
| Agency select | `FilterSelect` inline in `marketplace.tsx` L31-62: extract |
| Server re-render | `useServerRefresh` in `src/features/shifts/use-server-refresh.ts` |
| Single stacking table | `OpenShiftsTable` in `open-shifts-table.tsx` |
| Read query | `getAgencyBoard` and `inScheduleOrder` in `src/features/shifts/server/shift-service.ts` |
| Test cleanup | `deleteOwnRows`, `accounts`, `PASSWORD`, `sessionIdOf` in `e2e/support.ts`; `signIn` in `agency-ui.spec.ts`, `tokenFor` in `cancel-api.spec.ts`; throwaway agency in `tests/integration/shifts.test.ts` |

## Design

**Types** (`src/features/shifts/types.ts`):
- `AdminShift = AgencyShift & Pick<ShiftDTO, "agencyId" | "agencyName">`
- `AgencyOption = { id: string; name: string }`

**Server** (`shift-service.ts`):
- `getAdminBoard(): Promise<AdminShift[]>` is `findMany` over every shift. It includes `claimedBy.name` and `agency.name` and uses `inScheduleOrder`. `getAgencyBoard` and `getAdminBoard` share one small row mapper.
- `listAgencies(): Promise<AgencyOption[]>` is ordered by name.
- Like `getAgencyBoard`, neither takes an actor; the page's `requireRole("admin")` is the authoritative check.

**Routes.** These are added and removed together, because two pages for `/admin` would conflict:
- Add `src/app/(workspace)/admin/layout.tsx`. It copies the agency layout: `requireRole("admin")`, `workspaceName="Administration"`, `roleLabel="Administrator"`, and `<nav aria-label="Administration">` with a "Shift overview" link to `/admin`.
- Add `admin/page.tsx`. Inside `<Suspense>` it runs `requireRole("admin")`, then `Promise.all([listAgencies(), getAdminBoard()])`, and renders `<AdminShiftOverview agencies shifts />`.
- Add `admin/error.tsx`: "We couldn't load the shift overview." with a "Try again" button that calls `retry()`.
- **Delete** `src/app/(workspace)/(standard)/layout.tsx` (the header-only layout with its own Prisma lookup, used only by `/admin`) and `src/app/(workspace)/(standard)/admin/page.tsx` (the placeholder). Git keeps both. Nothing else lives in the group, and `scripts/harness.json` doesn't reference it.

**Shared UI extracted** (behavior unchanged, all in `src/features/shifts/components/`):
- `summary-cards.tsx`: `SummaryCards({ summary, emptyNote })` holds the four cards and the coverage meter.
- `status-tabs.tsx`: `StatusTabs({ tabs, active, onSelect })` holds the tablist, arrow keys and `aria-controls`.
- `filter-select.tsx`: `FilterSelect` with `options: readonly { value; label }[]`. The marketplace maps its strings into that shape.
- `StatusBadge` gains an optional `testId` prop, rendered as `data-testid`.

**Admin components:**
- `admin-shift-overview.tsx` (client) holds the header, the Refresh button, the cards, the panel and the banner.
- State is the agency ID (or all) and the tab. The cards and tab counts use `summarize` over the agency-filtered list, as on the agency board, where the tab doesn't change the cards. The rows are that list filtered by the tab.
- The Refresh button is disabled while `useServerRefresh().refreshing` is true. Only a refresh started by the button sets the hidden "Shift overview refreshed." status.
- A `visibilitychange` listener calls `refresh()` when `document.visibilityState === "visible"` and no refresh is pending.
- `admin-shifts-table.tsx` follows `OpenShiftsTable`: one `<table data-testid="admin-dashboard-shift-table">` whose `thead` hides and whose rows stack below `md`. The Shift cell wraps the full ID (`break-all`), and the Status cell is `<StatusBadge status testId="admin-shift-status-badge" />`.

## Steps and progress

- [x] **0. Baseline and branch.** `git switch -c feat/admin-shift-overview`. Confirm the dev branch holds only seeded rows: `tests/integration/support.ts`'s `assertSeededState` runs in `pnpm test`.
- [x] **1. Server read.** (`pnpm test`: 143 passed)
  - Add `AdminShift` and `AgencyOption`, then `getAdminBoard` and `listAgencies`, with the shared mapper.
  - In `tests/integration/shifts.test.ts`, assert that `getAdminBoard` returns the three seeded shifts with the right `agencyName`, `nurseName` ("Maria Lopez" on shift-2) and status, plus the throwaway agency's shift with that agency's name, in schedule order.
  - Assert that `listAgencies` includes both fixture agencies and the throwaway one, sorted by name.
  - Run `pnpm test`.
- [x] **2. Extract shared UI.** Move `SummaryCards`, `StatusTabs` and `FilterSelect` out, and add the `testId` prop to `StatusBadge`. `ShiftBoard` and `Marketplace` use the extracted pieces with identical markup. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test:e2e e2e/agency-ui.spec.ts e2e/nurse-ui.spec.ts`.
- [x] **3. Route move.** Add the admin `layout.tsx`, `page.tsx` and `error.tsx`, and delete the two `(standard)` files in the same change. Run `pnpm test:e2e e2e/auth-ui.spec.ts`: admin landing, the "Administrator" label, redirects and revoked session.
- [x] **4. Overview UI.** Add `RefreshIcon`, `AdminShiftsTable` and `AdminShiftOverview` with the filter, tabs, empty states, refresh button, refresh on return and banner, following the mockup's spacing and copy.
- [x] **5. Browser tests** in a new `e2e/admin-ui.spec.ts`.
  - It reserves dates 2027-09-01..03, which no other spec uses, and cleans up with `deleteOwnRows`. Parallel specs add rows, so it asserts named rows and internal consistency, never absolute counts.
  - **Seeded rows.** The admin sees the seeded rows: Oct 2 is Sunrise, Unassigned, Open; Oct 3 is Sunrise, Maria Lopez, Filled; Oct 4 is Metro, Unassigned, Open. Each row has exactly one `admin-shift-status-badge` with that text, and "Shift overview" carries `aria-current`.
  - **Totals agree.** The All tab count equals the number of rows and "Showing N shifts". The Open and Filled cards equal their tab counts.
  - **Agency filter.** Choosing "Metro Care Partners" shows Oct 4 and hides Oct 2 and Oct 3. Every row's agency is Metro, and the totals still agree.
  - **Refresh.** With the page open, agency-b posts a 2027-09-01 shift through the API. It is absent until Refresh is pressed, then appears as Open and Unassigned. Maria claims it through the API, and after Refresh it reads Maria Lopez and Filled (PR-05).
  - **Return refresh.** A shift posted on 2027-09-02 appears after a dispatched `visibilitychange`, with no click.
- [x] **6. Manual check** (partly automated; see Verification) with `pnpm dev`, signed in as the admin:
  - At 375px and 1440px: cards and rows stack, there is no page-wide horizontal scroll, and long shift IDs wrap.
  - Keyboard only: sidebar, Refresh, select, tabs with arrow keys, and Clear filters.
  - An overnight row shows "(+1 day)".
  - The filtered-empty state, through the agency select plus the Filled tab when that combination is empty.
  - Record the error boundary only if it was actually triggered.
- [x] **7. Docs.**
  - ARCHITECTURE:
    - the status line;
    - the §3 layout tree: `admin/` with its own layout, `(standard)` removed, and `nurse/` listed outside it, a stale entry;
    - §4 state ownership and L187: the admin overview is a Server Component refreshed by the button and on tab return, and TanStack is still deferred;
    - the service list.
  - DESIGN:
    - a new "Admin shift overview" subsection marked implemented, with the copy, the omitted status dropdown and the refresh behavior;
    - L294: the admin has no cancel UI, by design;
    - L298: history moves to the audit log plan.
  - PRODUCT: Journey E step 3 and §14 item 6 say the page refreshes on demand and when the tab is shown again, with no push.
  - decisions.md: the owner decisions below, plus the agent defaults.
  - VERIFICATION: the `pnpm test:e2e` row lists `admin-ui.spec.ts`, and L79's limitations are updated.
  - Tech-debt tracker: update TD-1's wording.
- [x] **8. Verify and hand off.** Run `pnpm verify` and confirm the dev branch row counts. Record the actual output below, tick the criteria, then move this plan to `completed/` and run `pnpm check:docs`. Commit only when the owner asks, using the `contextual-commits` skill.

## Decisions and discoveries

Owner decisions (2026-10-18, during planning):

- **Follow the approved mockup** for layout and copy.
- **No "All statuses" dropdown.** Status is only open or filled, so it would duplicate the tabs.
- **Refresh with the button and when the tab becomes visible again.** No timer.
- **From the mockup:**
  - no admin cancel or no-show action;
  - no cancellation note on the overview.

  Cancellation history is shown by the audit log plan. This amends the 2026-10-17 entry "History is stored, not shown … the audit plan and the admin dashboard plan display them."

Agent proposals, not yet reviewed by the owner:

- Show the full shift ID under the role, wrapping, so an admin can later match audit entries. New IDs are `shift-<uuid>`.
- Agency options come from the `Agency` table, sorted by name, with agency IDs as the values. An agency with no shifts still appears.
- The cards and tab counts follow the agency filter; the tab filters only the rows.
- No new API route: `GET /api/shifts` already serves the cross-agency list to API callers.
- `getAdminBoard` takes no actor, matching `getAgencyBoard`. The page's `requireRole("admin")` authorizes.
- Add an `error.tsx` for the admin segment only. The agency and nurse workspaces have none yet.

## Verification

Run on 2026-10-18 on branch `feat/admin-shift-overview`:

- `pnpm verify` exited 0: `check:docs` passed, `lint` clean, `build` compiled, `typecheck` clean, `pnpm test` 13 files / 143 tests passed, `pnpm test:e2e` 89 passed (including `e2e/admin-ui.spec.ts`, `auth-ui`, `agency-ui`, `nurse-ui` unchanged).
- One earlier `pnpm verify` run failed once: `tests/integration/cancellations.test.ts` "lets the admin cancel with no-show…" timed out at 5000ms against Neon. The file is untouched by this plan; the immediate rerun passed. Treat it as latency flakiness, not a regression.
- Dev branch row counts after the runs: User 5, Agency 2, Shift 3, Credential 2, AuditEvent 0, Cancellation 0, LoginAttempt 0. `ApiSession` holds 31 rows (admin-1, agency-a, nurse-1) dating from 2026-10-17 on; they are not from this plan's specs, which delete their own sessions, so they were left in place for the owner to clear.
- Step 6 manual check: the 375px stacking and no page-wide horizontal scroll are asserted in `e2e/admin-ui.spec.ts`; arrow-key tabs and Clear filters/agency filter are also covered there. A human visual pass at 1440px, sidebar/select keyboard order and the error boundary were **not** done: the error boundary was never triggered, so it is untested.
- Discovery: a long-running `pnpm dev` returned 404 for `/admin` after the `(standard)` route group was deleted; restarting it fixed it. Recorded in VERIFICATION.

## Handoff or outcome

Implemented as planned. Nothing is committed; commit with the `contextual-commits` skill when asked.

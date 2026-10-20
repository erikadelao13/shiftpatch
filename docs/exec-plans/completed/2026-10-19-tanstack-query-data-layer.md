# Move client data and mutations to TanStack Query

Status: Completed 2026-10-19
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-19

## Goal and acceptance criteria

Today every workspace page reads its data in a Server Component and passes it to a client view as props. The browser fetches nothing: `apiFetch` is only used for the five writes, and every view re-reads by calling `router.refresh()` (directly or through `useServerRefresh`). This plan moves browser server-state to TanStack Query. Server Components still produce the first render, but they now seed a query cache through `<HydrationBoundary>`. Views read that cache with `useSuspenseQuery`, writes go through `useMutation`, and a write invalidates the queries it affects instead of re-rendering the route.

`apiFetch` stays. It becomes the transport inside every `queryFn` and `mutationFn`. TanStack Query manages fetching, caching and request state. It does not replace `fetch`.

Owner-required (2026-10-19, see Decisions):

- Full scope: queries **and** mutations, with new same-origin GET routes for the data each view needs.

Acceptance:

1. `@tanstack/react-query` (5.x) is in `dependencies` and `pnpm-lock.yaml` is committed. The exact version is recorded under Decisions.
2. Every workspace view reads server data from a query: agency board, nurse marketplace, credentials page, admin shift overview, audit log, and the three timesheet pages. Each page's Server Component fetches the same query key on the server and dehydrates it, so the first render still holds the data. An e2e test proves that loading each page sends **no** request to its GET route.
3. Every write uses `useMutation`: post shift, agency cancel/no-show, nurse claim, nurse cancel, credential upload. The hand-written pending state (`claimingId`, `pending`, the `awaitedShift` ref and its `useEffect`) is gone. Each mutation invalidates the keys in the invalidation map below.
4. `router.refresh()` and `useServerRefresh` no longer appear in `src/`, and `src/shared/client/use-server-refresh.ts` is deleted.
5. Behavior is unchanged where the docs fix it. DESIGN.md's pending rules still hold (for example "Posting…" stays until the refreshed list has rendered). A failed cancel refreshes the list before its message shows. Admin pages refetch on the Refresh button and on tab return, with no timer. Nurse and agency pages do not refetch on tab return. Filters and tabs survive a refetch. Every existing e2e and integration test passes, unless a change is recorded under Decisions with the reason.
6. Query keys start with the signed-in user's ID, and signing out clears the browser query cache. An e2e test signs out one nurse and signs in another in the same tab, and none of the first nurse's data appears.
7. A cross-view invalidation test passes. An agency cancels an assignment, follows the sidebar link to Timesheets without a reload, and sees the cancellation.
8. The six new GET routes (table below) return `401` without a session, `403` for the wrong role, and `200` with `Cache-Control: no-store` and the documented body. An e2e API spec covers each case. The six spec-required routes are unchanged.
9. `ARCHITECTURE.md`, `docs/decisions.md`, `docs/VERIFICATION.md` (e2e spec list) and `docs/DESIGN.md` (if the refresh-failure state changes) are current. `pnpm verify` exits 0.

Non-goals:

- Optimistic updates. PRODUCT.md requires that a displayed success reflect a persisted claim.
- Polling with `refetchInterval`. PRODUCT.md "Journey E" says there is no timer.
- Changing the login form, which stays a Server Action.
- Server-side caching with `use cache`, `cacheTag` or `updateTag`. No server read is cached today, so there is no server tag to invalidate.
- Streaming pending queries through dehydration. This could be a later optimization.
- React Query Devtools.
- Any change to the six spec-required routes or their DTOs.

## Context

Baseline (main at `b1e07ad`, 2026-10-19): the last full run recorded 220 unit and integration tests and 110 e2e tests (feature-folders plan). Step 1 re-measures these.

Current data flow:

| Page | Server read (page.tsx) | Client view | Writes (`apiFetch`) | Re-read |
| --- | --- | --- | --- | --- |
| `/agency` | `getAgencyName`, `getAgencyBoard(agencyId)` | `features/shifts/views/shift-board.tsx` | `POST /api/shifts`, `POST /api/shifts/:id/cancel` | `router.refresh()` plus an `awaitedShift` ref (post); `useServerRefresh` (cancel, also on failure) |
| `/nurse` | `getNurseMarketplace(id)`, `getCredentialExpiry(id)` (banner prop) | `features/shifts/views/marketplace.tsx` | `POST …/claim`, `POST …/cancel` (`advance`) | `useServerRefresh` (claim: not awaited, in `finally`; cancel: awaited, also on failure) |
| `/nurse/credentials` | `getCredentialRecord(id)`; banner and current card render on the server | `features/credentials/views/credential-upload-form.tsx` | `POST /api/credentials` (multipart) | `useServerRefresh` |
| `/admin` | `listAgencies`, `getAdminBoard` | `features/shifts/views/admin-shift-overview.tsx` | none | Refresh button and `visibilitychange` |
| `/admin/audit` | `listAuditEntries` | `features/audit/views/audit-log.tsx` | none | Refresh button and `visibilitychange` |
| `/{nurse,agency,admin}/timesheets` | `listTimesheetEntries(scope)` | `features/timesheets/views/timesheet.tsx` | none | Refresh button, plus `visibilitychange` for admin only |

Constraints:

- **This reverses recorded decisions.** `docs/decisions.md` 2026-10-17 says "TanStack Query is deferred", and ARCHITECTURE.md §9 records that `GET /api/timesheets` was decided against on 2026-10-18. The owner has now chosen otherwise (see Decisions). Both records need a dated superseding entry.
- **The spec's `GET /api/shifts` cannot serve the views.** It returns `ShiftDTO` without nurse names, and the agency, admin and marketplace views need view-shaped data (`AgencyShift`, `AdminShift`, `MarketplaceShift`). The services that produce those shapes already exist, so each new route is a thin adapter over one of them.
- **Next.js 16 guide.** `node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md` is the reference for the provider (one client per server render, a reused singleton in the browser), for sharing `queryOptions` between the server prefetch and the client hook (with `queryFn` overridden on the server), and for keeping queries behind `<Suspense>` under `cacheComponents`, because `dehydrate()` reads the current time. Every page already reads the session inside `<Suspense>`, so the prefetch happens there.
- **Boundaries.** Features cannot import each other or `@/server`, and `shared/` cannot import features (ESLint enforces this). Shift mutations must invalidate timesheet queries, so the **keys** live in `shared/`. `app/` pages may import feature query options for the prefetch.
- **`requireActor`** already accepts the session cookie and skips the same-origin check for GET, so browser `queryFn`s authenticate with no change.
- **The existing focus test may need its event fixed.** `e2e/admin-ui.spec.ts:292` dispatches `new Event("visibilitychange")` on `document`, and that event does not bubble. TanStack Query's `focusManager` is believed to listen on `window`. Check this in `node_modules/@tanstack/query-core` after installing. If it is true, change the test to dispatch `{ bubbles: true }`, as a real browser does, and record the change.
- No React Testing Library is installed. Client behavior is proven by Playwright, which matches the repo today.

## Proposed design (agent proposals, not yet reviewed, except where marked owner)

**Files:**

- `src/shared/client/query-client.ts`: `makeQueryClient()` with the defaults below. The server pages and the provider both use it.
- `src/shared/client/query-provider.tsx` (`"use client"`): the guide's pattern, with a new client per server render and one browser singleton.
- `src/shared/client/query-keys.ts`: key factories, each starting with the user ID (ARCHITECTURE §4, "Scope query keys by actor and resource").
- `src/app/(workspace)/layout.tsx` (new): wraps all three role layouts in the provider.
- `src/features/<module>/queries/*.ts` (a new role folder): `queryOptions` factories that hold the key from `query-keys.ts`, the browser `queryFn` (`apiFetch` GET) and per-query options. Views use them in hooks, and `app/` pages spread them with a server `queryFn`. Components never import them.
- Mutations stay inline in each view. The 2026-10-19 decision "No `hooks/` folder, no `use-shift-actions`" still applies, because the two views' writes differ.

**Server prefetch, per page:**

```tsx
const queryClient = makeQueryClient();
await queryClient.fetchQuery({ ...agencyBoardQuery(user.id), queryFn: () => getAgencyBoard(agencyId) });
return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <ShiftBoard userId={user.id} agencyName={agencyName} />
  </HydrationBoundary>
);
```

`fetchQuery` throws, unlike `prefetchQuery`, so a failed read still reaches the route's `error.tsx` as it does today. The view calls `useSuspenseQuery(agencyBoardQuery(userId))`, which gets hydrated data and never suspends on first render. Values that never change in a session (`agencyName`, `today`, `audience`) stay plain props.

**Query defaults (chosen to keep current behavior):** `staleTime: 30_000`, so a freshly hydrated query does not refetch on mount. `retry: false`, because today's refresh does not retry and three retries would delay errors by about 7 s. `refetchOnWindowFocus: false`, `refetchOnReconnect: false` and no `refetchInterval`. Admin queries (overview, audit, admin timesheets) set `refetchOnWindowFocus: "always"`, so returning to the tab always refetches as it does today, even inside `staleTime`.

**Refresh buttons:** `await refetch()`, then announce the existing text ("Shift overview refreshed.", "Audit log refreshed.", "Timesheet refreshed."). `isFetching` replaces `refreshing`.

**New GET routes.** The owner approved these paths in the planning preview. Bodies and 403 wording are proposals.

| Route | Caller | `200` body | Source |
| --- | --- | --- | --- |
| `GET /api/agency/board` | agency (own agency, from the session) | `{ shifts: AgencyShift[] }` | `getAgencyBoard(actor.agencyId)` |
| `GET /api/nurse/marketplace` | nurse | `NurseMarketplace` (`{ openShifts, myShifts }`) | `getNurseMarketplace(actor.id)` |
| `GET /api/admin/board` | admin | `{ agencies: AgencyOption[], shifts: AdminShift[] }` | `listAgencies()`, `getAdminBoard()` |
| `GET /api/audit` | admin | `{ entries: AuditEntry[], total: number }` | `listAuditEntries()` |
| `GET /api/timesheets` | any role, scoped by role | `{ entries: TimesheetEntry[] }` | `listTimesheetEntries` with scope `nurse` / `agency` / `all` taken from the actor |
| `GET /api/credentials` | nurse | `{ status: CredentialStatus, document: CredentialDocumentSummary \| null }` | `getCredentialRecord(actor.id)` and `getCredentialStatus(…, todayIsoDate())` on the server |

All six send `Cache-Control: no-store`. Proposal: add `requireActorRole(request, role)` to `src/server/auth/request-auth.ts`, which throws `HttpError(403, …)`, so routes stay thin. An agency account with no `agencyId` gets `403`.

**Credentials composition:** a client view `features/credentials/views/credential-status.tsx` reads the credential query and renders `CredentialBanner`. `nurse/page.tsx` prefetches the credential and marketplace queries and passes `<CredentialStatus userId=… />` as the marketplace's `banner` prop, which is the existing composition. `credentials/page.tsx` renders a client `credential-workspace.tsx` view (banner, upload form, current card) reading the same query.

**Invalidation map.** "Awaited" means the mutation stays pending until the refetch settles, which replaces today's awaited `refresh()`.

| Mutation | View | Invalidates | When |
| --- | --- | --- | --- |
| Post shift | ShiftBoard | `agencyBoard` | `onSuccess`, awaited. "Posting…" lasts until the new row renders |
| Cancel / no-show (agency) | ShiftBoard | `agencyBoard`, `timesheets` | `onSettled`, awaited. A failure refreshes the list before the dialog shows the error |
| Claim | Marketplace | `marketplace`, `timesheets` | `onSettled`, **not** awaited. The notice shows when the POST returns, and the table stays busy while `isFetching` (as today) |
| Cancel (nurse, `advance`) | Marketplace | `marketplace`, `timesheets` | `onSettled`, awaited |
| Upload credential | CredentialWorkspace | `credential` | `onSuccess`, awaited, before the form resets and the notice shows |

`claimingId` becomes `isPending ? variables.id : null`.

**Sign-out:** keys are scoped by user ID, and the sidebar's sign-out form becomes a small client form (in `shared/ui/`) that calls `queryClient.clear()` before the `signOut` action runs. This is not done in a provider-unmount effect, because React Strict Mode would clear the freshly hydrated cache in development.

## Steps and progress

- [x] **1. Baseline and decisions.** Branch `refactor/tanstack-query` from `main`. Run `pnpm verify` and record the test counts and any failures under Verification. Confirm open decisions D2 to D5 with the owner, or proceed on the defaults below and say so. Add the superseding entry to `docs/decisions.md` first, so later steps cite it.
- [x] **2. Foundation.** `pnpm add @tanstack/react-query` (plus `@tanstack/eslint-plugin-query` as a devDependency if D5 holds). Check the peer range against React 19.3 and record the version. Add `query-client.ts`, `query-provider.tsx`, `query-keys.ts`, `(workspace)/layout.tsx` and the cache-clearing sign-out form. Inspect `focusManager` and settle the `visibilitychange` question. Run `pnpm lint`, `pnpm typecheck` and `pnpm build`; the app must behave the same.
- [x] **3. GET routes.** Add `requireActorRole`, then the six routes, then `e2e/views-api.spec.ts` (401, 403 per wrong role, 200 body and `no-store`, timesheet scoping per role, agency board restricted to the caller's own agency). Update ARCHITECTURE §7 "Supporting routes". Run `pnpm test:e2e e2e/views-api.spec.ts`.
- [x] **4. Refresh-only views.** Move the audit log, the three timesheet pages and the admin overview to prefetch, hydration and `useSuspenseQuery`. Replace the `visibilitychange` effects and `refreshingRef` with query options, and the Refresh handlers with `refetch()`. Run `admin-ui`, `timesheets-ui` and `smoke`.
- [x] **5. Agency board.** Agency board query, plus post and cancel mutations. Delete `awaitedShift`, `startRefresh` and the `useRouter` import. Run `agency-ui`, `cancel-api` and `shifts-api`.
- [x] **6. Nurse pages.** Credential query, `credential-status` and `credential-workspace` views, marketplace query, claim and cancel mutations, upload mutation. Run `nurse-ui`, `credentials-ui`, `claim-api`, `credentials-api` and `timesheets-ui`.
- [x] **7. Cleanup and new behavior tests.** Delete `use-server-refresh.ts`. `grep -rn "router.refresh\|useServerRefresh" src` must print nothing. Add the e2e tests for "no initial GET" (each page), sign-out cache isolation, and agency cancel → Timesheets via client navigation.
- [x] **8. Docs and full verification.** Update ARCHITECTURE: the status line, the §2 "Client server-state" row, the §3 layout tree and dependency rules (`queries/`, new `shared/client` files, new routes, `use-server-refresh` removed), the §4 state-ownership table and the query-key paragraph, and §9 timesheets. Update `docs/VERIFICATION.md` (new spec), and `docs/DESIGN.md` if D2 changes the refresh-failure state. Run `pnpm verify`, record the output, then move this plan to `completed/`.

## Decisions and discoveries

**Owner decisions:**

- 2026-10-19: **Full scope.** TanStack Query takes over both reads and writes, with server-seeded hydration and new GET routes for the data each view needs (paths as in the route table). This supersedes "TanStack Query is deferred" (decisions.md, 2026-10-17) and the 2026-10-18 rejection of `GET /api/timesheets` (ARCHITECTURE §9).

**Open, with the default an implementer uses if the owner doesn't answer:**

- **D1. Route bodies and 403 wording.** Default: the route table above. 403 messages follow the existing pattern ("Only nurses can claim shifts"), for example "Only administrators can read the audit log".
- **D2. Refresh failure.** Today a failed `router.refresh()` falls through to the route's error boundary. DESIGN.md's "Refreshing" rule says to keep the existing content and mark it stale. Default: follow DESIGN. Keep the rows, skip the "…refreshed." announcement, and show the `apiFetch` message (existing copy, "Could not reach the server. Check your connection and try again.", or the server's error) in a `role="alert"`. Initial-load failures still go to `error.tsx`.
- **D3. Query defaults.** As listed under Proposed design. They are chosen to match current behavior, not tuned.
- **D4. File placement.** Keys go in `src/shared/client/query-keys.ts` and options in `src/features/<module>/queries/`. Mutations stay inline in the views.
- **D5. Tooling.** Add `@tanstack/eslint-plugin-query` (its `exhaustive-deps` rule catches keys that miss a `queryFn` input). Do not add Devtools.

**Agent defaults used (owner did not answer D1 to D5):** all five as written. `@tanstack/react-query` and `@tanstack/eslint-plugin-query` are both 5.104.5, and the peer range accepts React 19.3.

**Discoveries:**

- `focusManager` registers `visibilitychange` on `window`, so the old non-bubbling `document.dispatchEvent` in `e2e/admin-ui.spec.ts` no longer reached it. The test now dispatches `{ bubbles: true }`, as a real browser does.
- The credential status is now computed in one place, `getCredentialData` in `credential-service.ts`, and the `CredentialData` type is in `contracts/credentials/types.ts`. The route and the page prefetch both use it.
- My first `views-api` assertions compared row counts across separate reads, and other specs write shifts in parallel, so they failed intermittently. They now assert on the seeded shifts, which are stable.
- One full `pnpm verify` run had `/nurse/timesheets` in `query-cache.spec.ts` send a GET. It did not reproduce alone, in 3 repeats, or in 72 repeated runs of that spec and `timesheets-ui`, nor in the next full run. The cause is unknown.
- Not checked: that the sign-out isolation test fails when `queryClient.clear()` is removed.

## Verification

Baseline on `main` (`b1e07ad`): 220 unit and integration tests, 110 e2e, all passing.

After the change, `pnpm verify` exits 0 (docs check, lint, build, typecheck, 25 test files with 220 tests, and 141 e2e tests: the 110 existing plus 21 in `views-api.spec.ts` and 10 in `query-cache.spec.ts`). No existing e2e test changed except the `visibilitychange` event noted under Discoveries.

## Handoff or outcome

Done. All eight steps are complete on branch `refactor/tanstack-query`, uncommitted. `grep -rn "router.refresh\|useServerRefresh" src` prints nothing.

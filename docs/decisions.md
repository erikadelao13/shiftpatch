# Decisions

Consequential decisions and the reasons for them. [PRODUCT.md](PRODUCT.md) and [../ARCHITECTURE.md](../ARCHITECTURE.md) point here for unresolved assumptions. Newest entries go at the bottom of each section. Change a decision by adding a dated entry, not by rewriting history.

## Owner decisions

These are settled.

### 2026-10-16: self-managed JWT authentication, not Clerk

Clerk session tokens are JWTs and can be verified as Bearer tokens. However, Clerk issues them only after a sign-in through its frontend. On the server, `users.verifyPassword()` returns only `{ verified: true }`, with no session and no token ([Clerk docs](https://clerk.com/docs/reference/backend/user/verify-password)). Meeting the spec's email/password-to-token endpoint would therefore mean running two token systems and a guard with three validators.

One self-managed token replaces all of that. It supersedes the Clerk design the architecture first described. See [../ARCHITECTURE.md](../ARCHITECTURE.md) §7.

### 2026-10-16: Neon Postgres through Prisma, with `dev` and `production` branches

Tests run on the `dev` branch. As a result, tests never reset or truncate data: they create rows with unique IDs and delete only those.

### 2026-10-16: one env file per Neon branch

`.env` holds the `production` branch and `.env.development` holds `dev`. Development tools, including tests, use `dev`. `NEON_BRANCH` is the guard: seeding, `prisma migrate dev`, `migrate reset`, `db push` and every test run refuse unless it is `dev`. [../ARCHITECTURE.md](../ARCHITECTURE.md) §12 lists which tool reads which file.

### 2026-10-17: a shift is `open` or `filled`, and cancellation is history

Remove the Cancelled tab and badge. A cancellation reopens the shift and is kept as history; the admin view can later show something like "Reopened after no-show". This closes the open item about `admin-shift-status-badge`.

### 2026-10-17: shift roles are RN and LPN only

Both a database enum and a zod enum; any other role gets `400`. Adding a role takes one migration.

### 2026-10-18: CI on the shared `dev` branch, Vercel deploys `main` only

- **CI tests run on the shared Neon `dev` branch.** CI test jobs are queued so they never overlap each other. A CI run can still collide with a local run at the same moment, and that risk is accepted. A throwaway branch per run was rejected because it needs a broad `NEON_API_KEY` secret and changes to the `NEON_BRANCH` guard.
- **Vercel's Git integration deploys `main` only, with no preview deployments.** Deployment Checks hold the production promotion until CI passes. Neon preview branches and deploying from GitHub Actions were rejected for now.
- **Secrets reach GitHub and Vercel only over stdin**, piped by `gh` and the Vercel CLI from the local env files. They never appear in a command, in output, or in the repository. The production `AUTH_JWT_SECRET` is generated straight into Vercel.

See [exec-plans/completed/2026-10-18-ci-and-vercel-deployment.md](exec-plans/completed/2026-10-18-ci-and-vercel-deployment.md).

### 2026-10-19: server code, contracts and Server Actions live outside `src/features/`

`src/features/` is frontend only. Server code lives in `src/server/<module>/`, the contracts the frontend and the server share (DTO types, Zod schemas, enums, pure helpers) in `src/contracts/<module>/`, and Server Actions in `src/actions/<module>.ts`. Actions are the public client-to-server boundary, so they sit beside `src/server/`, which frontend code cannot import. Behavior did not change. See [../ARCHITECTURE.md](../ARCHITECTURE.md) §3.

## Agent defaults

Chosen by the implementing agent where the spec was silent. Not yet reviewed by the owner; treat them as defaults and change them with a dated entry.

### 2026-10-16: token and session

- The token lifetime is 8 hours, held in one constant (`SESSION_TTL_SECONDS`).
- Every verification also checks a server-side `ApiSession` row, so logout revokes a token immediately.
- Passwords use `node:crypto` scrypt, which adds no dependency.

### 2026-10-16: login throttle

Ten failed attempts per email within 15 minutes block further attempts with `429`, even with the right password. A successful sign-in clears that email's failures. The limit is per email only; see TD-13 in [exec-plans/tech-debt-tracker.md](exec-plans/tech-debt-tracker.md).

### 2026-10-16: the browser signs in through a Server Action

The token goes straight into an `HttpOnly` cookie and never reaches page JavaScript. The Route Handler returns the token in its body only to direct API callers. Cookie-authenticated unsafe methods must send a matching `Origin`.

### 2026-10-16: supporting auth routes

The spec defines only `POST /api/auth/login`. `GET /api/auth/me` returns `{ user: { id, name, role, agencyId } }` and `POST /api/auth/logout` returns `204`. Both shapes are proposals.

### 2026-10-16: proxy redirects are optimistic

`src/proxy.ts` reads only the cookie's signature and expiry, never the database. Each page does the authoritative check. The proxy never redirects `/login`, so a revoked session that still carries a valid signature cannot cause a loop. *Amended 2026-10-17, see below.*

### 2026-10-17: a signed-in visitor to `/login` is redirected by the page

The owner noticed that a signed-in user visiting `/login` saw the form. The page now calls `getOptionalUser()` (cookie, then database) inside `<Suspense>` and redirects to the user's workspace when the session is live. A revoked or expired session stays on the form, so there is no loop, and the page itself stays static. The proxy is unchanged.

### 2026-10-17: Prisma 7.10.1, pinned

npm's `latest` tag for `prisma` is an 8.0 release candidate, while `@prisma/client` and `@prisma/adapter-pg` are 7.10.1 on `latest`. All three are pinned to `7.10.1` so the CLI and client match. Revisit when Prisma 8 is stable.

### 2026-10-17: sign-in screen omits recovery and "remember me"

The authentication flow supports neither, and registration and recovery are out of scope. "Need access? Contact your administrator" is plain text because there is no destination to link. See [DESIGN.md](DESIGN.md) §6.

### 2026-10-17: shift decisions in the listing and posting plan

- **IDs are `shift-<uuid>`, generated by the service.** The plan preferred `shift-N` from a Postgres sequence, but Prisma cannot express a sequence-backed default: every `migrate dev` generated a new migration rewriting it. The seeded shifts keep `shift-1` to `shift-3`; the spec says `shift-7` is only an example.
- An `agencyId` in a `POST /api/shifts` body is stripped, not rejected. The shift always goes to the caller's own agency.
- An agency reading another agency's list gets `403`, checked before existence, so agency IDs cannot be probed. The admin gets `404` for an unknown agency.
- The admin cannot post shifts. ARCHITECTURE §7's "no additional capability required" is read as no.
- Re-seeding resets `shift-1` to `shift-3` to their trial-start state and leaves every other shift alone.
- TanStack Query is deferred. The agency board is a Server Component that refreshes with `router.refresh()` after a successful POST.

### 2026-10-17: claiming and credential decisions

Owner decisions, made while planning the claim:

- **Credentials live in a `Credential` table**, seeded with the spec's expiries. The banner and the claim both read it. Upload has its own plan later.
- **Audit starts with an `AuditEvent` table.** Only claims are audited, inside the claim transaction. Auditing posts and the admin view belong to the audit plan.
- **"Today" for expiry is the UTC calendar date.** A credential stays valid through its expiry date.
- **The nurse UI was committed first**, on a feature branch.

Agent defaults, not yet reviewed by the owner:

- **Check order:** role, then credential, then whether the shift exists, then whether it is available. James gets the credential `403` even for an unknown or filled shift.
- **Messages:** "Only nurses can claim shifts" (`403`), "No credential on file, cannot claim shift" (`403`), "Shift not found" (`404`) and "Shift is no longer available" (`409`, which also covers the nurse's own claimed shift).
- **Race safety** comes from a conditional `updateMany` under READ COMMITTED, with no serializable isolation or retries.
- **Data shape:** one `Credential` row per nurse. Audit rows reference their resource by type and ID with no foreign key.
- **Re-seeding** resets both nurses' expiry dates to the spec values.

### 2026-10-17: cancellation and no-show decisions

Owner decisions, made while planning the cancellation:

- **Agencies get both reasons**, through one "Cancel shift" button per filled row whose dialog asks for the reason ("In advance" preselected). This keeps exactly one `shift-cancel-button` per row.
- **No timing rule.** Either reason works on any filled shift, past or future.
- **History is stored, not shown.** The `Cancellation` row and the audit event are written now; the audit plan and the admin dashboard plan display them.

Agent defaults, not yet reviewed by the owner:

- **Check order and messages** are in ARCHITECTURE §6. A nurse's no-show is refused before any database read, and a nurse cancelling the same claim twice gets `409`, not `403`.
- **Data shape:** a `Cancellation` table that cascades with its shift and restricts deleting its users; the database stores `no_show` and the presenter maps it to `"no-show"`; one audit action, `shift_cancelled`, with the reason in its metadata in the API spelling.
- **The response carries only `{ reason, previousNurseId }`**, exactly as the spec shows.
- **The previous nurse may claim the shift again**, including after a no-show. No rule in the packet forbids it.
- **Re-seeding** deletes the seeded shifts' `Cancellation` rows and leaves audit rows alone.
- **Race safety** comes from a conditional `updateMany` keyed on the previous nurse, under READ COMMITTED, as in the claim.
- **A failed cancel refreshes the list** behind the dialog before showing the server's message.

### 2026-10-18: admin shift overview decisions

Owner decisions, made while planning the overview:

- **Follow the approved mockup** for layout and copy.
- **No "All statuses" dropdown.** Status is only open or filled, so it would duplicate the tabs.
- **Refresh with the button and when the tab becomes visible again.** No timer.
- **No admin cancel or no-show action and no cancellation note on the overview**, as in the mockup. The audit log plan shows cancellation history. This amends the 2026-10-17 entry "History is stored, not shown", which expected the admin dashboard to display it.

Agent defaults, not yet reviewed by the owner:

- The full shift ID shows under the role, wrapping, so an admin can match audit entries.
- Agency options come from the `Agency` table, sorted by name, so an agency with no shifts still appears.
- The cards and tab counts follow the agency filter; the tab filters only the rows.
- No new API route; `getAdminBoard` takes no actor, and the page's `requireRole("admin")` authorizes.
- `error.tsx` exists for the admin segment only.

### 2026-10-18: credential upload UI decisions

Owner decisions:

- **Build the UI first**, following the supplied credentials mockup. The route and storage came next (see the 2026-10-18 upload decisions below).

Agent defaults, not yet reviewed by the owner:

- **`POST /api/credentials`** with `multipart/form-data` fields `file` and `expiresOn`.
- **A 4 MB limit**, not the mockup's 5 MB, because a Vercel Function rejects request bodies over 4.5 MB.
- **PDF, JPEG and PNG only**, as the mockup lists.
- **A past expiry date is rejected** (changed the same day; see below).
- **No "authorized users" footer**, because document read access beyond the nurse is undefined.

### 2026-10-18: credential upload decisions

Owner decisions, answered while planning:

- **Store the bytes in Postgres**, in a separate `CredentialDocument` table, instead of Private Vercel Blob. This replaces the blob row in ARCHITECTURE §2.
- **Reject expiry dates before today.** Today is accepted. This replaces the UI decision above that accepted a past date.
- **Only the nurse downloads a document.** Agency and admin access stays undefined.
- **Record `credential_updated` audit events** with `{ previousExpiresOn, expiresOn }` and no file name.

Agent proposals, not yet reviewed by the owner:

- **The route contract** in ARCHITECTURE §9: `POST /api/credentials`, `GET /api/credentials/document`, the `200` shape, and the error messages and their order.
- **`413`** joins the error statuses for the `Content-Length` guard only.
- **The detected type wins over the declared type.** Only a file that is not a PDF, JPEG or PNG is rejected.
- **Saves for one nurse are serialized** by locking the nurse's `User` row, so first saves cannot collide and `previousExpiresOn` is accurate.
- **Re-seeding** deletes the fixture nurses' documents and leaves audit rows alone.

### 2026-10-18: audit log decisions

Owner decisions, answered while planning:

- **A page only, with no `GET /api/admin/audit`.** The page's `requireRole("admin")` authorizes, as on the admin overview.
- **The newest 50 events plus a total count**, with no paging controls.
- **Credential events show the nurse ID** in the Record column. New events store `nurseId` in their metadata, and older rows fall back to the actor.

Agent defaults, not yet reviewed by the owner:

- **`shift_posted` metadata is `{ agencyId, role, date }`**, a snapshot, so the entry outlives the shift.
- **Metadata is parsed strictly.** A malformed row fails the page instead of being dropped, because hiding history is worse than a visible error.
- **Only successful business events are audited.** There are no login or failed-attempt events, no backfill for seeded shifts and no seeded audit rows, so the dev page shows its empty state until someone acts.

### 2026-10-18: timesheet decisions

Owner decisions, answered while planning:

- **Build the agency (own agency) and admin (all) views**, reusing the nurse table with a Nurse column.
- **Cancelled and no-show assignments are history rows** taken from `Cancellation`, excluded from the totals, with no migration.
- **No `Timesheet` table and no `GET /api/timesheets`.** Hours entry and submission are out of scope, so every row would hold no hours; the page alone is authorized by `requireRole`, as the audit log is.
- **Replace the "Recorded work hours" card** with a "Cancelled or no-show" count, recorded in DESIGN as a deviation from the mockup.

Agent defaults, not yet reviewed by the owner:

- **One `listTimesheetEntries(scope)`** rather than one function per role. Pages authorize and build the scope.
- **Ordering:** date, start time, the shift's `createdAt`, shift ID, then history before the current assignment. Entries are keyed by shift ID or cancellation ID.
- **Pill colors:** neutral for Cancelled and danger for No-show.
- **Agency and admin copy** as written in DESIGN §7.
- **The admin page refreshes on tab return**, as the overview and audit log do; nurse and agency pages do not.
- **No admin agency filter.** The admin table stacks below `xl`.

### 2026-10-18: CI and deployment decisions

Agent defaults from the CI and deployment plan, not yet reviewed by the owner:

- **Two GitHub secrets only: `DEV_DATABASE_URL` and `DEV_DATABASE_URL_UNPOOLED`.** `NEON_BRANCH: dev` is a literal in the workflow, and `AUTH_JWT_SECRET` is generated per run, because every token in a run is signed and verified inside it.
- **Vercel holds only `DATABASE_URL` and `AUTH_JWT_SECRET`, in Production only.** `DATABASE_URL_UNPOOLED` and `NEON_BRANCH` aren't read at runtime.
- **`engines.node` is `"24.x"`**, matching `.nvmrc` and making Vercel's Node version deterministic.
- **Production seeding is a separate script with an explicit flag** (`pnpm db:seed:production`), not an environment variable that loosens the dev-branch guard.
- **gitleaks runs as a checksum-verified binary**, not through `gitleaks/gitleaks-action`, whose v2 tag still declares `node20` and comes under a commercial licence.

### 2026-10-19: placements and lint rules for the server/contracts/actions split

Agent defaults from the separation plan, not yet reviewed by the owner:

- **`use-server-refresh` is in `src/shared/client/`.** Three features use it, and features must not import each other's internals.
- **`constants.ts` is in `src/server/auth/` and stays free of `server-only`**, because `src/proxy.ts` imports it. `password.ts` and `token.ts` keep the same rule for the seed script and the proxy.
- **`workspace.ts` is in `src/contracts/auth/`**: a role-to-path map the proxy imports.
- **ESLint enforces the boundaries with `no-restricted-imports`**, so no new dependency. Frontend code (`features`, `shared`) cannot import `@/server`; contracts import no `@/server`, `@/features`, `@/actions`, `@/shared` or `server-only`; server code cannot import `@/features` or `@/actions`. Relative imports that reach those folders are refused too.

### 2026-10-19: structure inside feature folders

Agent defaults from the feature-folders plan, not yet reviewed by the owner:

- **Folders by role: `views/`, `components/`, `hooks/`, `lib/`.** A view is a client screen that owns state and calls the server; a component is props in, JSX out. `views/` rather than `screens/` or `containers/`, because Next.js already uses "page" and "layout". Every feature has the same shape, and a folder exists only when it has content (`auth` has only `components/`).
- **`contracts/` holds only what the server also uses.** `schedule`, `describe-event` and `hours` had no server consumer and moved to `features/<module>/lib/`.
- **Two helper groups went to `shared/lib/`, one more than planned.** `formatDate` is used by credentials, audit, shifts and timesheets. `endsNextDay`, `durationHours` and `formatEndsOn` are used by shifts and by timesheets (`hours.ts` and the table), so leaving them in `shifts/lib/` would have kept a cross-feature import.
- **`StatCard` is in `shared/ui/`, and the credentials banner reaches `Marketplace` as a `banner` prop** rendered by `nurse/page.tsx`. This resolves TD-20.
- **No `hooks/` folder, no `use-shift-actions`.** `shift-board` and `marketplace` share only the `apiFetch` call and refresh-on-failure. Their notice types differ (a string against `{ kind, message }`), their cancel reasons differ (a variable against a fixed `"advance"`), and post exists only in the board and claim only in the marketplace. A hook would need options for each difference.
- **ESLint generates one `no-restricted-imports` block per feature** from a list of names, refusing `@/features/<other>/**` and relative paths that climb into another feature. `shared` also cannot import `@/features`. Adding a feature means adding its name to the list in `eslint.config.mjs`.

## Open items

- Whether the Neon `dev` branch was created with the default 7-day TTL from `neon.ts` is unconfirmed. This repository treats `dev` as durable.

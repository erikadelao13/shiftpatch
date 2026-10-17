# Authentication

Status: Complete
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-16

## Goal and acceptance criteria

All five spec accounts can sign in through the API and through the approved login screen, then land on their role's workspace. One shared guard resolves the caller from a Bearer token or the session cookie, and logging out revokes the session on the server.

Acceptance:

- [x] Each of the five spec accounts gets a 200 from `POST /api/auth/login` with the exact `{ token, user: { id, name, role } }`. A wrong password or unknown email gets the exact `401 { "error": "Invalid email or password" }`, and malformed JSON or missing fields get `400 { error }`.
- [x] The returned token works as a Bearer token on `GET /api/auth/me`. Tampered, expired, wrong-audience and revoked tokens get `401 { error }`, and an invalid Bearer never falls back to the cookie.
- [x] Signing in through the browser with `login-email-input`, `login-password-input` and `login-submit-button` lands on the role's workspace, showing the name and role (and agency for agency users). A failure shows "Invalid email or password" in `notification-banner` and keeps the entered email. Submit is disabled while pending.
- [x] Signed-out visits to `/nurse`, `/agency` and `/admin` go to `/login`, and a wrong-role visit goes to the user's own workspace. Sign-out revokes the session server-side, so the old token then gets a 401.
- [x] More than 10 failed logins for one email within 15 minutes return `429 { error }`. No password, hash or token appears in any response other than the login token, or in any log.
- [x] Integration tests, `pnpm db:seed`, and `prisma migrate dev`, `migrate reset` and `db push` refuse to run unless `NEON_BRANCH=dev`. A deliberate attempt with production values fails before any query runs.
- [x] The docs listed in step 7 are updated, and `pnpm verify` passes: check:docs, lint, build, typecheck, test, e2e.

Non-goals:

- Shifts, credentials, audit and timesheets, beyond seeding the auth tables.
- Deploying to Vercel or the Neon production branch.
- CI (TD-2).
- Registration and password recovery.

## Context

Baseline at `3098e55`: the `create-next-app` page plus the harness. There is no backend, database or test runner. Next.js 16.4.2 with `cacheComponents` and `partialPrefetching` enabled, React 19.3, Tailwind v4, pnpm 10.27.0, Node 24.16.0.

**Requirements.** These come from the supplied spec, [../../ShiftPatch-Technical-Spec.md](../../ShiftPatch-Technical-Spec.md), which stays unchanged.

- **Accounts.** All five use the password `Trial2026!`:

  | Login email | ID | Name | Role |
  | --- | --- | --- | --- |
  | `admin@sunrisehealth.example` | `agency-a` | Sunrise Health Staffing | agency |
  | `admin@metrocare.example` | `agency-b` | Metro Care Partners | agency |
  | `maria.lopez@example.com` | `nurse-1` | Maria Lopez | nurse |
  | `james.cook@example.com` | `nurse-2` | James Cook | nurse |
  | `alex.kim@example.com` | `admin-1` | Alex Kim | admin |

- **Contract.** `POST /api/auth/login` takes `{ email, password }` and returns `200 { token, user: { id, name, role } }`, or `401 { "error": "Invalid email or password" }`.
- **Transport and errors.** Every authenticated route accepts `Authorization: Bearer <token>`, and every error has the shape `{ "error": "..." }`.
- **Product requirements.** [../../PRODUCT.md](../../PRODUCT.md) PR-01 and the "Identity and agency boundaries" rules.

**Design.** The approved sign-in screen is described in [../../DESIGN.md](../../DESIGN.md) §2–§6.

**Next.js references.** Read these before writing code:
- `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`: a session read must sit behind `<Suspense>`.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`: `src/proxy.ts`, which runs on the Node runtime by default.

**Environment.** This machine has no Docker or local Postgres. Neon is the only database.

Affected paths:
- **New:**
  - Prisma setup: `prisma/`, `prisma.config.ts`.
  - App code: `src/features/auth/`, `src/shared/server/`, `src/app/login/`, `src/app/(workspace)/`, `src/app/api/auth/`, `src/proxy.ts`.
  - Tests: `vitest.config.mts`, `tests/integration/`, `e2e/auth-*.spec.ts`.
  - Docs and config: `docs/decisions.md`, `.env.example`.
- **Changed:**
  - Config: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.gitignore`, `eslint.config.mjs`.
  - App: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
  - Tests: `e2e/smoke.spec.ts`.
  - Docs: [../../../ARCHITECTURE.md](../../../ARCHITECTURE.md), [../../DESIGN.md](../../DESIGN.md), [../../VERIFICATION.md](../../VERIFICATION.md), [../tech-debt-tracker.md](../tech-debt-tracker.md), [../../../AGENTS.md](../../../AGENTS.md), [../../README.md](../../README.md), [../../PLANS.md](../../PLANS.md).

**Environment files.** There are two gitignored files, one per Neon branch:

| File | Neon branch | Keys present on 2026-10-16 | Missing |
| --- | --- | --- | --- |
| `.env` | `production` (`NEON_BRANCH=production`) | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH` | `AUTH_JWT_SECRET` |
| `.env.development` | `dev` (`NEON_BRANCH=dev`) | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH` | `AUTH_JWT_SECRET` |

- `DATABASE_URL` is the pooled connection string. `DATABASE_URL_UNPOOLED` is the direct one, used for migrations. It was called `DIRECT_DATABASE_URL` until 2026-10-16 and was renamed to the name `neon env pull` writes.
- `AUTH_JWT_SECRET` must be different in each file. Generate each with `openssl rand -base64 32`. The production one is needed only for a local `pnpm start` and for the later deployment.
- Every key the app reads must exist in `.env.development`. Next layers `.env` underneath it, so a key missing in development silently falls back to the **production** value.

Which file each tool reads. Next's `@next/env` loads `.env.$MODE.local`, `.env.local`, `.env.$MODE`, then `.env`:

| Tool | Mode | Reads | Database |
| --- | --- | --- | --- |
| `next dev`, and Playwright, which starts `pnpm dev` | development | `.env.development` over `.env` | dev |
| `next build`, `next start` | production | `.env` | **production** |
| Vitest, by default | test | `.env.test*`, then `.env`; never `.env.development` | **production**, unless step 6 overrides it |
| Prisma CLI | set by `prisma.config.ts` | `.env.development` over `.env` (step 2) | dev |

## Design

- **One token for both paths.** The token is an HS256 JWT signed with `jose`. Claims: `iss=shiftpatch`, `aud=shiftpatch-api`, `sub=<local user id>`, `sid=<ApiSession id>`, `role`, `exp`. The lifetime is 8h and lives in one constant. The signing key is `AUTH_JWT_SECRET`.
  - `POST /api/auth/login` returns the token in the response body, as the spec requires.
  - The browser signs in through a Server Action that sets the same token as an HttpOnly cookie named `shiftpatch_session` (SameSite=Lax, Secure in production). Browser JavaScript never receives the token.
- **Stateful revocation.** Every verification also loads the `ApiSession` row and requires that it isn't revoked, isn't expired, and belongs to the user in `sub`. Logout sets `revokedAt` on that row.
- **Passwords** are hashed with `node:crypto` `scrypt`: a random salt per user, compared with `timingSafeEqual`. This adds no dependency. When the email is unknown, the code still runs a dummy hash so the response time doesn't reveal whether the account exists.
- **Throttle.** Each failed attempt is stored as a `LoginAttempt` row. After 10 failures for the same email within 15 minutes, login returns `429 { error }`. A successful sign-in clears that email's failures.
- **Guard rules** for `requireActor(request)`:
  - If an `Authorization` header is present, it must be a valid Bearer token. An invalid one returns 401 and never falls back to the cookie.
  - Otherwise the guard uses the session cookie. Cookie-authenticated unsafe methods must also send an `Origin` that matches the host, or they get a 403.
  - With neither, the response is `401 { error }`.
  - On success the guard returns the actor `{ id, name, role, agencyId }`, loaded from the database. Authorization never comes from the token's `role` claim.
- **Pages.** `src/proxy.ts` does optimistic redirects using only the JWT signature and expiry, with no database call:
  - `/` goes to the user's workspace or to `/login`.
  - `/nurse`, `/agency` and `/admin` without a valid cookie go to `/login`.
  - A user on another role's workspace is redirected to their own.
  - `/login` is never redirected away. That prevents a redirect loop when a revoked session still carries a valid signature.

  Each page then does the authoritative check, `getCurrentUser()` (cookie, then database, otherwise `redirect('/login')`), inside `<Suspense>`.
- **Environment safety.** Production values sit in `.env`, so development tools must opt into `.env.development`, and a guard backs that up:
  - `prisma.config.ts` loads the development files through `@next/env` `loadEnvConfig(cwd, true)`, unless `NODE_ENV=production`.
  - `vitest.config.mts` loads them with Vite's `loadEnv("development", root, "")` and passes the result to `test.env`. It can't use `@next/env`, because `NODE_ENV=test` overrides the mode there.
  - `NEON_BRANCH` is the guard. The Vitest setup file checks it before any database test, `prisma/seed.ts` checks it, and `prisma.config.ts` checks it for `migrate dev`, `migrate reset` and `db push`. Confirm that `process.argv` exposes the command in the installed CLI; if it doesn't, wrap those commands in a guarded script.
  - Nothing may query the database at build time, because `next build` loads `.env`, which points at production. The existing `/api/health` already follows this rule.
  - Playwright reuses any server already running on port 3000. A `pnpm start` there would point the e2e tests at production, so only `pnpm dev` may hold that port during e2e runs.

## Steps and progress

- [x] Establish the baseline and resolve the material decisions with the owner (2026-10-16).
- [x] **1. Prerequisites.** Check that `.env.development` holds `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH=dev` and `AUTH_JWT_SECRET`, and that `.env` holds the same four keys with `NEON_BRANCH=production`. Print key names only, never values. If any key is missing, stop and ask the owner.
  - 2026-10-16: both files held the three Neon keys; `AUTH_JWT_SECRET` was missing, so the agent stopped and asked. The owner then added it. Re-checked (names only): both files hold all four keys, the two secrets differ, `.env` has `NEON_BRANCH=production`, `.env.development` has `NEON_BRANCH=dev`. The `dev` branch TTL is still unconfirmed by the owner.
- [x] **2. Database foundation.** Confirm syntax against the installed versions before writing config.
  - 2026-10-16 progress: dependencies installed; `prisma.config.ts`, `prisma/branch-guard.ts`, `prisma/schema.prisma`, `prisma/fixtures.ts`, `prisma/seed.ts`, `.env.example`, scripts and the Prisma client on the shared `pg` pool (`getPrisma()` in `db.ts`) are written. `prisma validate` and `prisma generate` pass with no database. The guard is verified (see Verification). On 2026-10-16 `pnpm db:migrate` failed with `P1001` (TCP 5432 timed out while HTTPS worked); the owner asked for a retry on 2026-10-17 and it succeeded, so the failure was transient. Migration `20261017063412_init` is applied to the dev branch and `pnpm db:seed` loaded 2 agencies and 5 users, twice, with no error (idempotent).
  - Dependencies:
    - Runtime: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `jose`, `zod`, `server-only`.
    - Development: `tsx`, `@next/env`, `vitest`.
  - pnpm 10 blocks install scripts by default, so allow Prisma's in `pnpm-workspace.yaml`.
  - `prisma.config.ts` loads `.env.development` over `.env` through `@next/env` `loadEnvConfig(cwd, true)`, unless `NODE_ENV=production`. It refuses `migrate dev`, `migrate reset` and `db push` unless `NEON_BRANCH=dev`. Migrations use `DATABASE_URL_UNPOOLED`.
  - `prisma/schema.prisma` defines:
    - enum `Role { nurse agency admin }`
    - `Agency(id, name)`
    - `User(id, email @unique, name, role, agencyId?, passwordHash)`
    - `ApiSession(id, userId, createdAt, expiresAt, revokedAt?)`
    - `LoginAttempt(id, email, attemptedAt)`, with an index on `(email, attemptedAt)`
  - The generated client goes to `src/generated/prisma`. It is gitignored and ignored by ESLint, and `postinstall: prisma generate` regenerates it. Generating must not require a database connection.
  - `src/shared/server/db.ts` holds the Prisma singleton and imports `server-only`. It uses the pooled `DATABASE_URL`.
    - Since 2026-10-16 the file already exists. It holds the `pg` pool (`getDb()`, `pingDatabase()`), and `pg` and `server-only` are installed.
    - Build the Prisma client on that pool through `@prisma/adapter-pg`, rather than opening a second pool.
    - Keep `pingDatabase()`: `GET /api/health` uses it.
  - `prisma/fixtures.ts` holds the spec's agencies and users exactly. `prisma/seed.ts` upserts them idempotently and hashes `Trial2026!`, which is a public fixture password, not a secret.
  - Add `.env.example`, plus a `!.env.example` exception in `.gitignore`. It documents both files and which tool reads which.
  - Scripts: `db:migrate` and `db:seed` target dev. `db:deploy` runs only with an explicit `NODE_ENV=production` and belongs to the deployment plan; this plan doesn't run it.
  - `prisma/seed.ts` refuses to run unless `NEON_BRANCH=dev`. The deployment plan will add an explicit override for seeding production.
  - Run the migration and the seed against the dev branch (`NEON_BRANCH=dev`).
- [x] **3. Auth core** in `src/features/auth/`:
  - `schemas.ts`: the zod login body.
  - `types.ts`: `Role`, `Actor`, `PublicUser`.
  - `server/password.ts`
  - `server/token.ts`: sign and verify. It has no Prisma import, so the proxy can import it.
  - `server/sessions.ts`: create, resolve and revoke sessions.
  - `server/login.ts`: `authenticate(email, password)`, which runs the throttle, verifies the password and issues the token.
  - `server/request-auth.ts`: `requireActor(request)`.
  - `server/current-user.ts`: `getCurrentUser()`, wrapped in React `cache()`, plus `workspacePathFor(role)`.

  Shared error helper: `src/shared/server/errors.ts` turns errors into `{ error }` responses with status 400, 401, 403, 429, or a sanitized 500.
- [x] **4. Routes:**
  - `src/app/api/auth/login/route.ts`.
  - `api/auth/me/route.ts` returns `{ user: { id, name, role, agencyId } }`.
  - `api/auth/logout/route.ts` is a POST that revokes the session and returns 204, and clears the cookie if the request was cookie-authenticated.

  Also `src/proxy.ts`, whose matcher excludes `api`, `_next/static`, `_next/image` and static files.
- [x] **5. Browser UI**, following DESIGN.md §6:
  - `src/features/auth/actions.ts` has the Server Actions `signIn` and `signOut`.
  - `components/login-form.tsx` is a client component built on `useActionState`:
    - It has the three `login-*` test IDs.
    - It shows a password visibility toggle.
    - It shows "Signing in…" and disables submit while pending.
    - Errors appear in a `role="alert"` element with `data-testid="notification-banner"`, and the entered email is kept.
  - `src/app/login/page.tsx` is the split brand/form layout with the approved copy. It has no recovery link and no "remember me" box. "Need access? Contact your administrator" is plain text.
  - `src/app/(workspace)/layout.tsx` adds a header with the wordmark, the signed-in name and role (plus the agency name for agency users), and sign-out. That part streams behind `<Suspense>`.
  - `nurse/page.tsx`, `agency/page.tsx` and `admin/page.tsx` each check the role and show an honest placeholder until their feature plans land.
  - Design tokens go in `globals.css`. Fonts switch to Inter and DM Serif Display through `next/font`, which removes the Arial override (TD-3).
  - Replace the boilerplate `src/app/page.tsx` and metadata (TD-4). List the unused create-next-app SVGs in `public/` by name before deleting them.
- [x] **6. Tests.**
  - **Vitest setup:** `vitest.config.mts` with the `@/*` path alias and `server-only` aliased to an empty stub. It loads `.env.development` as described under Design, and a setup file fails the run before any database test unless `NEON_BRANCH=dev`. Add a `test` script and put `pnpm test` in `verify` after `typecheck`.
  - **Unit tests** sit next to the code:
    - Password hashing and verification.
    - Token checks: wrong secret, wrong audience or issuer, expired, `alg: none`.
    - `requireActor`: choosing Bearer or cookie, no fallback after an invalid Bearer, and the Origin check.
  - **Integration tests** in `tests/integration/auth.test.ts` run against the Neon dev branch:
    - `authenticate()` for all five accounts.
    - Wrong password and unknown email.
    - Throttle behavior, using a throwaway email.
    - A revoked session is rejected.

    Tests never reset the database. They create uniquely identified rows and delete only those.
  - **Playwright:**
    - `e2e/auth-api.spec.ts` checks the exact login bodies for all five users, the 401 and 400 bodies, a Bearer call to `/me`, a tampered token, and that the token stops working after logout.
    - `e2e/auth-ui.spec.ts`:
      - Maria signs in through the test IDs and lands on `/nurse` showing her name.
      - A wrong password shows the banner text and keeps the email.
      - Visiting `/admin` while signed out goes to `/login`.
      - A nurse visiting `/admin` is sent to `/nurse`.
      - Sign-out works, and the back button then lands on `/login`.
    - Update `e2e/smoke.spec.ts` for the new `/`.
- [x] **7. Docs.** Bring these up to date with what this change invalidates:
  - **ARCHITECTURE.md:**
    - §2: the auth rows, and npm changed to pnpm.
    - §3: the layout.
    - §4: the state-ownership rows.
    - §5: User gains `passwordHash`; add `LoginAttempt`; remove Clerk provisioning.
    - §7: rewrite.
    - §11 and §12: remove the Clerk rows and add the new environment variables.
    - §12: add `.env.development`, the dev branch, and which tool reads which file to the Neon section.
    - Sources: remove C1–C8.
  - **DESIGN.md §6:** remove the Clerk paragraph.
  - **`docs/decisions.md`:** new; PRODUCT.md already references it. Record the decisions below.
  - **VERIFICATION.md:**
    - Environment prerequisites: `pnpm test` and pre-push now need the database and network.
    - The isolation section: replace "point `.env` at a dev branch" with the two-file layout and which command reads which file.
    - Remove the "no tests" limitation.
  - **TD-1:** update the entry.
  - **Stale "Draft/undefined" labels and references:**
    - In `AGENTS.md` and `docs/README.md`: the "Draft/undefined" labels.
    - In PLANS.md, VERIFICATION.md and the setup plan: references to T1–T5 and P1–P7, which no longer exist in those documents.
- [x] **8. Verify and hand off.** Run the checks in Verification, record the actual output here, tick the acceptance criteria that pass, and leave the next action written down.

## Decisions and discoveries

Owner decisions:

- **2026-10-16 — self-managed JWT, not Clerk.** Clerk session tokens are JWTs and can be verified as Bearer tokens. However, Clerk only issues them after a sign-in through its frontend. On the server, `users.verifyPassword()` returns only `{ verified: true }`, with no session and no token ([Clerk docs](https://clerk.com/docs/reference/backend/user/verify-password)). Meeting the spec's email/password-to-token endpoint would therefore mean running two token systems and a guard with three validators. One self-managed token replaces all of that. This supersedes ARCHITECTURE.md §7.
- **2026-10-16 — Neon Postgres via Prisma**, with a `dev` and a `production` branch. **Tests run on the dev branch.** As a result, tests must never reset data; they only create and delete their own uniquely identified rows.
- **2026-10-16 — one env file per branch.** `.env` holds the `production` branch and `.env.development` holds `dev`. Development tools, including tests, use `dev`.

Agent proposals, not yet reviewed by the owner:

- 8h token lifetime.
- Throttle at 10 failures per email per 15 minutes, cleared on a successful sign-in.
- The browser signs in through a Server Action, so the token never reaches browser JavaScript; the Route Handler returns it only to direct API callers.
- `GET /api/auth/me` and `POST /api/auth/logout` response shapes. The spec doesn't define them.
- Proxy redirects are optimistic only. `/login` is never redirected away by the proxy, to avoid loops. *Amended 2026-10-17: the login page redirects signed-in visitors itself, after a database check (see `docs/decisions.md`).*

Agent deviations from the plan, 2026-10-17 (each keeps the plan's intent):

- **`requireSession` beside `requireActor`.** `requireActor(request)` returns the actor as planned. Logout also needs the session ID and whether the request used the cookie, so the guard's core is `requireSession(request)` returning `{ actor, sessionId, source }`, and `requireActor` wraps it.
- **`workspacePathFor` lives in `src/features/auth/workspace.ts`**, re-exported from `current-user.ts`. The proxy imports it, and `current-user.ts` pulls in `next/headers` and `server-only`, which the proxy must not load. `src/features/auth/constants.ts` holds the cookie name, token lifetime, issuer, audience and throttle numbers, for the same reason.
- **`requireRole(role)`** was added to `current-user.ts` so the three workspace pages share one role check.
- **`vite` is a direct devDependency (8.3.4).** `loadEnv` lives in `vite`, which pnpm's strict layout doesn't expose from Vitest's dependency. The version matches the one Vitest already resolves.
- **`prisma migrate deploy` also refuses without `NODE_ENV=production`.** This enforces the plan's "`db:deploy` runs only with an explicit `NODE_ENV=production`".
- **`tests/setup.ts` runs the `NEON_BRANCH` guard for every test file**, not only database tests. Simpler and stricter; it also means unit tests need `.env.development`.
- **Agency header shows the agency name only when it differs from the user's name.** An agency login is named after its agency, so the header otherwise repeated it.
- **Tech debt.** TD-3 (Arial override) and TD-4 (boilerplate page and SVGs) are resolved and removed from the tracker. TD-1 is rewritten. TD-12 (unpruned `LoginAttempt` and `ApiSession` rows) and TD-13 (per-email-only throttle) are new.
- **Files deleted (2026-10-17, announced before deletion):** `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`. Unused create-next-app boilerplate (TD-4); the only references were in the old `page.tsx`.
- **Dev-branch rows deleted:** three times, rows my own manual checks created (one leftover `LoginAttempt`, and six `ApiSession` rows from the screenshot and curl sign-ins). Nothing else was touched; the dev branch holds only the 2 agencies and 5 users.

Discoveries:

- **2026-10-17 — a hydration warning in the dev log is not an app defect.** Playwright's screenshots add `style="caret-color: transparent"` to inputs, which React reports as a server/client mismatch. It appeared only during the agent's screenshot script.
- **2026-10-16 — Prisma versions pinned to 7.10.1.** npm's `latest` tag for `prisma` is `8.0.0-rc.23`, a release candidate, while `@prisma/client` and `@prisma/adapter-pg` are 7.10.1 on `latest`. The agent pinned all three to `7.10.1` (`prisma`'s own `prev` tag) so the CLI and client match.
- **2026-10-16 — `@types/node` raised to ^24.** Vitest 5 requires `@types/node` 22 or 24+; the repo had ^20. Node is pinned at 24.16.0, so ^24 matches the runtime.
- **2026-10-16 — Prisma 7 config.** The datasource URL lives in `prisma.config.ts`, not the schema. `process.argv` does expose the subcommand inside the config, so no wrapper script is needed. The agent also made `migrate deploy` refuse to run unless `NODE_ENV=production`, matching the plan's `db:deploy` rule.
- **2026-10-16 — pnpm build scripts.** `onlyBuiltDependencies` in `pnpm-workspace.yaml` allows `prisma`, `@prisma/engines` and `esbuild` (needed by `tsx` and Vitest).
- **2026-10-16 — docs have drifted.** `AGENTS.md` and `docs/README.md` still label PRODUCT.md "Draft, undefined" and DESIGN.md "boilerplate only", although both now hold real content. PLANS.md and the setup plan cite T1–T5 and P1–P7, which no longer exist in those documents. ARCHITECTURE.md specifies npm, while the repository uses pnpm. Step 7 fixes all of these.
- **2026-10-16 — Neon is linked to `production`, and the `dev` branch now exists.**
  - The owner's setup ran `neon init --branch production` and `neon deploy`, then added `.env.development` for `dev`.
  - `.neon` still pins `production`, so a bare `neon env pull` refreshes `.env` only. Refresh `.env.development` from the `dev` branch explicitly.
  - The default `neon.ts` gives every *new* non-default branch `ttl: "7d"`. **Unconfirmed:** whether `dev` was created with that TTL. This plan treats `dev` as durable, so the owner should check.
  - Details are in ARCHITECTURE.md §12.
- **2026-10-16 — with production in `.env`, Vitest would hit production by default.** Vitest runs with `NODE_ENV=test`, and in that mode Next's env loader reads `.env.test*` and `.env`, never `.env.development`. `next build` and `next start` also read `.env`. The "Environment safety" bullet under Design addresses this.
- **2026-10-16 — the spec mentions a `cancelled` status.** Its `admin-shift-status-badge` row lists open/filled/cancelled, while the API status is `open | filled`. This is outside the auth scope; leave it for the shifts plan.

## Verification

All run on 2026-10-17 from the repository root on Node 24.16.0, against the Neon `dev` branch.

**`pnpm verify`** (check:docs, lint, build, typecheck, test, test:e2e) exited 0:

```
Harness documentation checks passed.
✓ Compiled successfully in 704ms
  Finished TypeScript in 2.1s
✓ Generating static pages using 9 workers (12/12) in 282ms
 Test Files  5 passed (5)
      Tests  43 passed (43)
  34 passed (13.4s)
```

Route table from the build: `/` and `/admin`, `/agency`, `/nurse` partial prerender; `/login` static; `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/health` dynamic; `Proxy (Middleware)` present. `pnpm lint` and `pnpm typecheck` printed no findings.

**Environment guard.** Each of these refused before any query:

- `NEON_BRANCH=production` with an unreachable dummy URL, for `prisma migrate dev`, `migrate reset --force` and `db push`: a `Refusing to run …: NEON_BRANCH is "production", expected "dev"` error.
- `prisma migrate deploy` without `NODE_ENV=production`: a `Refusing to run … without NODE_ENV=production` error.
- `NEON_BRANCH=production pnpm db:seed`: `Refusing to seed the database: NEON_BRANCH is "production", expected "dev"`.
- Vitest with a scratch config forcing `NEON_BRANCH=production`: the suite failed in `tests/setup.ts` with `Refusing to run tests`, before any test body ran.
- Not done on purpose: running `migrate dev` with the real production `.env`. The dummy-URL runs exercise the same code path without risk.

**Manual checks** on `pnpm dev`:

- Sign-in through the browser as all five accounts: covered by a Playwright test per account (all passed), each landing on the right workspace and showing name and role.
- Login screen screenshots at 375, 768 and 1440 px: no horizontal overflow, brand panel collapses above the form below `lg`. The error state keeps the email and shows the banner. Signed-in header at 375 and 1440 px read correctly.
- Keyboard: Tab order is email, password, show-password button, Sign in. A Playwright test signs in with the keyboard alone.
- curl: login as Maria returned `200` with keys `token`, `user` and `user` equal to `{ id: nurse-1, name: Maria Lopez, role: nurse }`; `GET /api/auth/me` with the Bearer token returned `200 {"user":{"id":"nurse-1","name":"Maria Lopez","role":"nurse","agencyId":null}}`; `POST /api/auth/logout` returned `204`; `/me` again returned `401 {"error":"Invalid or expired token"}`. A wrong password returned `401 {"error":"Invalid email or password"}`, malformed JSON `400 {"error":"Request body must be valid JSON"}`, a missing field `400 {"error":"Email and password are required"}`, and the 11th failed attempt for one email `429`.
- The dev server log held no password, hash, token or `AUTH_JWT_SECRET` (grep count 0).
- After the final run the dev branch held 2 `Agency`, 5 `User`, 0 `ApiSession`, 0 `LoginAttempt` rows.

**Follow-up, 2026-10-17: signed-in visitors to `/login`.** The owner noticed a signed-in user saw the sign-in form. `src/app/login/page.tsx` now calls the new `getOptionalUser()` behind `<Suspense>` and redirects to the workspace when the session is live; a revoked session stays on the form. Added an e2e test for the redirect and extended the revoked-session test to visit `/login` directly. After the change: `pnpm lint`, `pnpm typecheck`, `pnpm build` clean; `pnpm test` 43 passed; `pnpm test:e2e` 35 passed. `/login` still builds as a partial prerender (`◐`). Note: the e2e run reused a `next dev` server already on port 3000 (the dev branch, not production), because `pnpm verify` was not re-run in full.

**Gaps, not verified:**

- No `pnpm start` run: it reads `.env` (production), so production-mode behavior (the `Secure` cookie, a production database) was not exercised.
- Rendered color contrast was not measured, though DESIGN.md asks for it. No screen reader testing.
- Browser coverage is Chromium only.
- The Neon `dev` branch TTL is still unconfirmed (ARCHITECTURE.md §12).
- The `sslmode=require` warning from `pg` remains (TD-11).
- No CI (TD-2), so nothing verifies a committed revision.

## Handoff or outcome

Complete 2026-10-17. All seven acceptance criteria pass, with the evidence above. The work is committed and merged on `main` (`1992efb` to `c977019`), and the code follows the `AGENTS.md` comment guidelines.

Known gaps:

- Not verified, and not tracked as debt: production mode (`pnpm start` reads the production `.env`, so the `Secure` cookie flag is untested), rendered color contrast, screen reader use, and browsers other than Chromium.
- Tracked in [../tech-debt-tracker.md](../tech-debt-tracker.md): no CI (TD-2), the per-email-only throttle (TD-13), and unpruned auth rows (TD-12).
- Whether the Neon `dev` branch has the default 7-day TTL is unconfirmed. It is listed under Open items in [../../decisions.md](../../decisions.md).

Next plan: shifts (`GET/POST /api/shifts`, claim, cancel, the agency-scoped list). It can reuse `requireActor` and the actor's `agencyId`, and it should first resolve the `cancelled` status question (see `docs/decisions.md`, Open items).

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

## Open items

- The spec's `admin-shift-status-badge` row lists open, filled and cancelled, while the API status is `open | filled`, and [../ARCHITECTURE.md](../ARCHITECTURE.md) §6 keeps cancellation in history rather than as a status. Resolve in the shifts plan.
- Whether the Neon `dev` branch was created with the default 7-day TTL from `neon.ts` is unconfirmed. This repository treats `dev` as durable.

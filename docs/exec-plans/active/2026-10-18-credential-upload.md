# Credential upload with an expiry date

Status: Active
Owner: Erika De LA O (decisions) / agent (implementation)
Created: 2026-10-18

## Goal and acceptance criteria

A signed-in nurse uploads one private document (PDF, JPG or PNG, up to 4 MB) with an expiry date. The document and the date are saved together, the nurse's eligibility follows the new date at once, and the nurse can open the document again. Nobody else can read it. This finishes Journey D and PR-09. The UI already exists, uncommitted, and posts to a route that doesn't exist yet.

Acceptance:

- [ ] **Baseline committed.** The uncommitted credentials UI on `main` is committed on `feat/credential-upload`, in its own commits, before any backend work.
- [ ] **Save contract.** `POST /api/credentials` takes `multipart/form-data` with `file` and `expiresOn` (`YYYY-MM-DD`). On success it returns `200` with exactly `{ nurseId, expiresOn, status, document: { fileName, contentType, sizeBytes, uploadedAt } }`, and `Cache-Control: no-store`. A second save replaces both the date and the document, so a nurse has at most one of each.
- [ ] **Errors.** Every error is `{ error }` with `Cache-Control: no-store`. The checks run in this order:
  1. `401` without authentication. `403` "Cross-origin request rejected" for a cookie POST from another origin (existing `requireActor` behavior).
  2. `403` "Only nurses can upload credentials" for an agency or the admin.
  3. `413` "Choose a file of 4 MB or less." when `Content-Length` exceeds the limit plus multipart overhead, before the body is read.
  4. `400` "Send the document and expiry date as multipart/form-data." when the body isn't multipart.
  5. `400` with the schema's first message: missing or empty file, wrong declared type, over 4 MB, or a missing or invalid date.
  6. `400` "Expiry date must be today or later." for a date before today (UTC calendar date). Today is accepted (owner decision).
  7. `400` "Choose a PDF, JPG or PNG file." when the file's leading bytes are not a PDF, JPEG or PNG. The detected type is stored; the browser's declared type is not trusted.

  A rejected request changes nothing: no `Credential` change, no `CredentialDocument` row, no audit event.
- [ ] **Download.** `GET /api/credentials/document` returns the signed-in nurse's own file with its stored type, `Content-Disposition: attachment` with the original file name, `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`. `401` without authentication, `403` "Only nurses can view credential documents" for other roles, `404` "No document on file". There is no way to read another nurse's document.
- [ ] **Eligibility.** A nurse whose credential expired saves a future date; the next claim succeeds. Saving does not touch any shift.
- [ ] **Audit.** Each successful save writes one `credential_updated` `AuditEvent` in the same transaction, with `{ previousExpiresOn, expiresOn }` (`previousExpiresOn` is `null` for a first save). No file name or content goes into the audit.
- [ ] **Race.** Two concurrent saves for the same nurse, including a nurse with no credential yet, both return `200`. Afterwards there is exactly one `Credential` and one `CredentialDocument`, both from the request that committed last. There are two audit rows, and the second one's `previousExpiresOn` is the first one's `expiresOn`. Proven against the dev database, five rounds.
- [ ] **UI.** On `/nurse/credentials`:
  - A successful save shows "Credential saved. Your expiry date is now <date>.", clears the form, and the banner and Current credential card show the new date and status.
  - The card shows the file name, size and upload date, with a "View document" link that downloads the same bytes. Without a document it keeps "No document uploaded".
  - The date input rejects a past date before sending, with the server's message. "Today" comes from the server, not the device clock.
  - Leaving the page and coming back doesn't show an old "Credential saved" banner.
  - A server error keeps the file and date and shows the server's message (already built).
  - After saving, the Shift marketplace shows the new status without a manual reload.
- [ ] **Seed and fixtures.** `pnpm db:seed` resets Maria and James to their spec expiry dates and removes any document they have. No test changes Maria's or James's credential.
- [ ] **Docs and checks.** The docs in step 7 are updated and `pnpm verify` passes. After the run the dev branch holds only seeded rows: 3 `Shift`, 2 `Credential`, 0 `CredentialDocument`, 0 `AuditEvent`, 0 `Cancellation`.

Non-goals:

- Agency or admin access to documents. Read access beyond the nurse is undefined.
- License verification, approval, document history or multiple documents per nurse. Expiry stays self-reported (PRODUCT §7).
- Files over 4 MB and direct-to-storage uploads.
- Showing credential audit events; the audit-log plan reads them.
- Virus scanning.

## Context

**Baseline.** `main` at `ae5ba72`, plus the uncommitted credentials UI from 2026-10-18:

- New: `src/app/(workspace)/nurse/credentials/page.tsx`; `src/features/credentials/{schemas.ts,schemas.test.ts}`; `src/features/credentials/components/{credential-upload-form.tsx,current-credential.tsx}`; `src/shared/ui/sidebar-nav.tsx`; `e2e/credentials-ui.spec.ts`.
- Edited: `src/app/(workspace)/nurse/layout.tsx` (sidebar uses `SidebarNav`, adds Credentials), `src/shared/client/api-client.ts` (JSON content type only for string bodies), `src/shared/ui/icons.tsx` (document, upload and lock icons).
- Docs: DESIGN §7 note, ARCHITECTURE §9 note, VERIFICATION, decisions (2026-10-18 entry), TD-1.
- `pnpm verify` passed on it on 2026-10-18 (151 Vitest, 93 Playwright).

Saving currently fails with "Something went wrong. Try again." because the route doesn't exist.

**Requirements.** The spec gives no credential route contract; only `credential-upload-input` and `credential-expiry-date-input` are required ([../../ShiftPatch-Technical-Spec.md](../../ShiftPatch-Technical-Spec.md)). PRODUCT Journey D, §7 "Credentials and time", PR-09, PR-13. ARCHITECTURE §7 permission table ("Upload credential: self only") and §9 "Credential upload".

**Owner decisions (2026-10-18), answered while planning:**

- Store the bytes in Postgres, in a separate table, instead of Private Vercel Blob. This replaces ARCHITECTURE §2's "Private Vercel Blob" row.
- Reject expiry dates before today.
- Owner-only download.
- Record `credential_updated` audit events.

**Reuse, don't rebuild:**

| Need | Existing code |
| --- | --- |
| Guard and errors | `requireActor` (`features/auth/server/request-auth.ts`), `HttpError`/`errorResponse` (`shared/server/errors.ts`) |
| Validation | `credentialUploadSchema`, `credentialFileSchema`, `MAX_CREDENTIAL_BYTES` (`features/credentials/schemas.ts`) |
| Status and today | `getCredentialStatus`, `todayIsoDate` (`features/credentials/status.ts`) |
| Transaction and audit | `claimShift`/`cancelShift` (`features/shifts/server/shift-service.ts`), `recordAuditEvent(tx, …)` (`features/audit/server/audit-service.ts`) |
| Route shape | `src/app/api/shifts/[id]/cancel/route.ts` |
| UI | `CredentialUploadForm`, `CurrentCredential`, `CredentialBanner`, `useServerRefresh`, `formatDate` |
| Tests | `tests/integration/claims.test.ts` (throwaway users, race loop), `tests/integration/support.ts` (`expectHttpError`, `assertSeededState`), `e2e/claim-api.spec.ts` (`tokenFor`, `bearer`), `e2e/support.ts` (`deleteOwnRows`) |

## Design

**Data model.** One migration, `credential_documents`:

```prisma
enum CredentialDocumentType {
  pdf
  jpeg
  png
}

enum AuditAction {
  shift_claimed
  shift_cancelled
  credential_updated
}

model CredentialDocument {
  credentialId String                 @id
  credential   Credential             @relation(fields: [credentialId], references: [id], onDelete: Cascade)
  fileName     String
  type         CredentialDocumentType
  sizeBytes    Int
  content      Bytes
  uploadedAt   DateTime
}
```

Add `document CredentialDocument?` to `Credential`.

- It is a separate table, so the banner, the claim check and the page never load the bytes.
- Append these hand-written statements to the generated SQL, each with a one-line comment:
  - `CHECK ("sizeBytes" = octet_length("content"))`
  - `CHECK ("sizeBytes" BETWEEN 1 AND 4194304)`
  - `CHECK (char_length("fileName") BETWEEN 1 AND 255)`
  - `ALTER COLUMN "content" SET STORAGE EXTERNAL`, because PDF, JPEG and PNG are already compressed.
- `uploadedAt` has no default and is set on every save, so a replaced file shows its own date.

**Pure helpers** (`src/features/credentials/document.ts`, no `server-only`, shared with the UI):

- `detectDocumentType(bytes: Uint8Array): CredentialDocumentType | null` reads the leading bytes:
  - `%PDF-` is a PDF.
  - `FF D8 FF` is a JPEG.
  - The 8-byte PNG signature is a PNG.
- `DOCUMENT_MIME_TYPES`: the type-to-MIME map.
- `cleanFileName(name, type)`:
  - Takes the basename, strips control characters and trims.
  - Caps the name at 255 characters.
  - Falls back to `credential.<ext>`.
- `contentDisposition(fileName)`: `attachment; filename="<ASCII-only fallback>"; filename*=UTF-8''<percent-encoded>`. A non-ASCII character in the plain `filename=` breaks browsers or throws in `Headers`.
- `formatFileSize(bytes)`: moved from `credential-upload-form.tsx` so `CurrentCredential` (a Server Component) can use it.
- `PAST_EXPIRY_MESSAGE = "Expiry date must be today or later."`

**Service** (`src/features/credentials/server/credential-service.ts`):

- `saveCredential(actor, { file, expiresOn }, today = todayIsoDate()): Promise<CredentialDTO>`
  1. If the actor isn't a nurse: `403`.
  2. If `expiresOn < today`: `400` with `PAST_EXPIRY_MESSAGE`.
  3. Read the bytes with `const bytes = new Uint8Array(await file.arrayBuffer())`. Prisma's `Bytes` is `Uint8Array<ArrayBuffer>`, so a `Buffer` won't assign.
  4. Run `detectDocumentType`. If it returns null: `400` "Choose a PDF, JPG or PNG file." Store the detected type and ignore the declared one, so a JPEG named `.png` is accepted.
  5. `getPrisma().$transaction(async (tx) => …, { timeout: 15_000, maxWait: 5_000 })`. The 5 s default can expire while 4 MB goes to Neon.
     1. ``tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actor.id} FOR NO KEY UPDATE` ``. This serializes saves for the same nurse, including first saves, without blocking claims, which only take `FOR KEY SHARE`.
     2. Read the previous `expiresOn`.
     3. `credential.upsert({ where: { nurseId }, create: { nurseId, expiresOn }, update: { expiresOn }, select: { id } })`.
     4. `credentialDocument.upsert` with `uploadedAt: now` in both create and update, and `select` metadata only, so the 4 MB content doesn't come back.
     5. `recordAuditEvent(tx, { actorId, action: "credential_updated", resourceType: "credential", resourceId: credential.id, metadata: { previousExpiresOn, expiresOn } })`.
  6. Return the DTO, with `status` from `getCredentialStatus`.
- `getCredentialRecord(nurseId)`: returns `{ expiresOn, document: { fileName, type, sizeBytes, uploadedAt } | null }` without the content. The page uses it.
- `getCredentialDocument(actor)`: nurse only. Returns `{ fileName, type, content }`, or `404` "No document on file".
- `getCredentialExpiry` stays as it is for the marketplace and the claim.

**Shared server** (`shared/server/errors.ts`, `shared/server/http.ts`):

- Add `413` to `ErrorStatus`.
- `assertContentLength(request, maxBytes)`: throws `413` when the `Content-Length` header exceeds the limit. It is best effort: a chunked request has no header, and the schema still catches the size.
- `readFormData(request)`: throws `400` "Send the document and expiry date as multipart/form-data." on any parse failure.

**Routes:**

- `src/app/api/credentials/route.ts`, `POST`:
  1. `requireActor`.
  2. Role check, with the same `403` as the service. Doing it here means another role never makes the server buffer a body.
  3. `assertContentLength(request, MAX_CREDENTIAL_BYTES + 64 * 1024)`.
  4. `readFormData`.
  5. `credentialUploadSchema.parse({ file: form.get("file"), expiresOn: form.get("expiresOn") })`.
  6. `saveCredential`, then `200` with `no-store`.
- `src/app/api/credentials/document/route.ts`, `GET`:
  1. `requireActor`, then `getCredentialDocument`.
  2. Return `new Response(content, …)` with `Content-Type`, `Content-Length`, `contentDisposition(...)`, `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`.
  3. Errors go through `errorResponse`.

  There is no ID in the path, so nothing can name another nurse's file.

**Seed.**

- Before upserting the fixture credentials, `prisma/seed.ts` deletes their `CredentialDocument` rows. Audit rows are left alone, as with cancellations.
- `assertSeededState` (`tests/integration/support.ts`) also requires zero `CredentialDocument` rows for `nurse-1` and `nurse-2`. A stray manual upload then fails loudly with "run pnpm db:seed".

**UI:**

- `page.tsx`:
  - Uses `getCredentialRecord`.
  - Passes `today` (already computed there) to `CredentialUploadForm`.
  - Passes the document to `CurrentCredential`.
- `CredentialUploadForm`:
  - Date input `min={today}`.
  - Rejects `expiresOn < today` before sending, with `PAST_EXPIRY_MESSAGE`.
  - Imports `formatFileSize`.
  - Clears the notice when Activity hides the page (`useLayoutEffect` cleanup, per `preserving-ui-state.md`), so an old "Credential saved" doesn't greet a returning nurse.
- `CurrentCredential`:
  - The Document row shows "<name> · <size>", "Uploaded <date>" (`formatDate(uploadedAt.toISOString().slice(0, 10))`) and a plain `<a href="/api/credentials/document">View document</a>`.
  - The note gains a third state for a document on file: "Uploading a new document replaces this one."

## Steps and progress

- [ ] **0. Baseline and branch.**
  - Ask the owner whether the uncommitted credentials UI is finished.
  - `git switch -c feat/credential-upload`.
  - Commit the UI by context with the `contextual-commits` skill:
    - shared nav and icons;
    - `apiFetch` body handling;
    - credentials schema and page;
    - the e2e spec;
    - the docs.
  - Print the key names in `.env.development`, never the values.
- [ ] **1. Schema, migration, seed.**
  - Edit `prisma/schema.prisma`, then `pnpm exec prisma migrate dev --create-only --name credential_documents`.
  - Append the CHECKs and the `SET STORAGE EXTERNAL` statement, read the SQL, then apply it with `pnpm db:migrate` (dev only).
  - Run `--create-only` again: it must produce an empty migration, which you delete.
  - Update `seed.ts` and `assertSeededState`, then run `pnpm db:seed`.
  - Restart any running `pnpm dev`, because the old Prisma client answers new routes with `500`.
- [ ] **2. Pure helpers and tests.**
  - Add `document.ts` and `document.test.ts`, covering:
    - each signature, plus empty, truncated and HTML bytes;
    - `cleanFileName` with paths, control characters, 300 characters and an empty name;
    - `contentDisposition` with an ASCII name, `é`, CJK characters and quotes;
    - `formatFileSize`.
  - Add `assertContentLength` and `readFormData`, with unit tests that build `Request` objects with a forged `Content-Length` and a non-multipart body.
- [ ] **3. Service and integration tests.** Add `saveCredential`, `getCredentialRecord` and `getCredentialDocument`, and write `tests/integration/credentials.test.ts` with throwaway nurses and an agency (the `claims.test.ts` pattern). It covers:
  - A first save, then a replacement: one `Credential` and one `CredentialDocument`, with a new `uploadedAt`, size and type.
  - Audit rows `{ previousExpiresOn: null, … }`, then the chained previous value.
  - An expired nurse saves a future date, then `claimShift` succeeds on a throwaway shift.
  - `403` for an agency and the admin; today accepted and yesterday rejected (injected `today`); HTML declared as PDF gives `400`. Each failure writes nothing.
  - Five rounds of two concurrent saves for a nurse with no credential: both `200`, one `Credential`, one `CredentialDocument` matching the last committed request, and two audit rows whose previous values chain.
  - `getCredentialDocument` returns identical bytes, or `404` without a document.
  - `afterAll` deletes the audit rows by actor and resource, then shifts, users and the agency.
- [ ] **4. Routes and API e2e.**
  - Add both routes.
  - Extend `e2e/support.ts`:
    - `createNurse({ expiresOn })` inserts a `test-<uuid>` user with `hashPassword(PASSWORD)` from `password.ts`, plus a `Credential` with an explicit `id` and `"updatedAt"`, which have no database defaults.
    - `deleteOwnRows` gains `userIds`: delete `AuditEvent` by `actorId`, then `User`, which cascades sessions and credentials. Include `userIds` in the early-return check.
  - Add `e2e/credentials-api.spec.ts` with Bearer tokens only. Playwright's `request.post` sends no `Origin`, so a cookie POST gets `403`. Every nurse is a throwaway nurse. Cover:
    - `401`, agency `403`, one schema `400`, the past-date `400`;
    - the exact `200` keys and `no-store`;
    - the download's bytes and headers, and `404` before any upload.
- [ ] **5. UI wiring.** Apply the UI changes in Design. Then, in `e2e/credentials-ui.spec.ts`:
  - Keep the mocked cases, with `.filter({ visible: true })` for the shared test IDs.
  - Add a real flow for an expired throwaway nurse:
    - upload a PDF with a future date;
    - see the success banner, a valid banner, and the file name and upload date on the card;
    - "View document" downloads the same bytes;
    - the Shift marketplace shows the valid banner, and a claim on a throwaway shift succeeds.
  - Add a past date rejected before sending.
- [ ] **6. Verify.**
  - `pnpm lint`, `pnpm build`, `pnpm typecheck`, `pnpm test`, then `pnpm test:e2e`.
  - Check by hand at 1512px and 390px, and with the keyboard only: empty, document on file, pending, server error, success, and James's expired state.
  - Afterwards, row counts on the dev branch: 3 `Shift`, 2 `Credential`, 0 `CredentialDocument`, 0 `AuditEvent`, 0 `Cancellation`.
- [ ] **7. Docs.**
  - ARCHITECTURE:
    - §2 row "Credential files", now Postgres;
    - the layout tree (`credentials/document/route.ts` replaces `credentials/[id]/file/route.ts`);
    - §5 `Credential` and the new `CredentialDocument`, plus the row counts at line 224;
    - §6 the two routes;
    - §7 a download row in the permission table;
    - §9 "Credential upload" rewritten as implemented, with no blob cleanup;
    - §12 no blob token;
    - the status line.
  - DESIGN §7 note: drop "every save currently ends in failure"; add the document row, "View document" and past dates.
  - VERIFICATION: the `test` and `test:e2e` rows, the row counts, Limitations.
  - decisions.md: the 2026-10-18 owner decisions; replace "A past expiry date is accepted".
  - TD-1. Add a tech-debt entry: documents live in Postgres (egress and size; move to object storage before real use).
- [ ] **8. Finish.** Run `pnpm verify`, record the output here, commit by context, and move this plan to `completed/` once every criterion passes.

## Decisions and discoveries

Owner decisions (2026-10-18), recorded in Context. Postgres storage replaces ARCHITECTURE's Private Vercel Blob.

Agent proposals, not yet reviewed by the owner:

- **The route contract:**
  - `POST /api/credentials`, multipart, with `file` and `expiresOn`;
  - `GET /api/credentials/document` for the owner;
  - `200` with `{ nurseId, expiresOn, status, document }`;
  - the error messages and order in the acceptance criteria.
- **4 MB limit**, because a Vercel Function rejects request bodies over 4.5 MB. **`413`** joins `ErrorStatus` for the `Content-Length` guard only.
- **The detected type wins over the declared type.** Only an unrecognised file is rejected.
- **Saves for the same nurse are serialized** by locking the nurse's `User` row (`FOR NO KEY UPDATE`), so first saves can't collide and the audit's `previousExpiresOn` is accurate.
- **The audit metadata excludes the file name**, which can hold personal details.
- **Re-seeding** deletes the fixture nurses' documents and leaves audit rows alone.

Discoveries while planning:

- Next 16 keeps visited pages mounted but hidden (`<Activity>`). The marketplace still refetches its data on navigation (`staleTimes.dynamic` is 0, and refresh invalidates the back/forward cache), so it doesn't need an app fix. But `credential-status` and `notification-banner` exist on both pages, so e2e locators must match visible elements only.
- Prisma 7's `Bytes` is `Uint8Array<ArrayBuffer>`. `Response` accepts it as a body.
- `ApiSession`, `Credential` and the new `CredentialDocument` cascade on user delete. `AuditEvent.actorId` and both `Cancellation` user keys are `RESTRICT`. A throwaway nurse with a filled shift can't be deleted until the shift is.
- No storage SDK is installed and the app isn't linked to Vercel. Postgres storage needs neither.

## Verification

Not started.

## Handoff or outcome

Next action: step 0.

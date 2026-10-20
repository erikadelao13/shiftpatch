"use client";

import { DocumentIcon, LockIcon, UploadIcon } from "@/shared/ui/icons";

import { formatFileSize } from "@/contracts/credentials/document";
import { useCredentialUpload } from "../hooks/use-credential-upload";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const fieldClass =
  "h-11 w-full rounded-control border border-input-border bg-surface px-3 text-base aria-[invalid=true]:border-danger-text disabled:bg-surface-subtle";

function describedBy(...ids: (string | false)[]): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined;
}

export function CredentialUploadForm({ userId, today }: { userId: string; today: string }) {
  const {
    inputRef,
    expiryRef,
    dragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    formKey,
    selected,
    errors,
    notice,
    pending,
    selectFile,
    clearExpiryError,
    dismissNotice,
    handleSubmit,
  } = useCredentialUpload(userId, today);

  return (
    <section
      aria-labelledby="upload-credential-title"
      className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 id="upload-credential-title" className="font-display text-2xl leading-tight">
        Upload a credential
      </h2>
      <p className="mt-1 text-text-muted">Add a new document or replace your current one.</p>

      <form key={formKey} onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span id="credential-file-label" className="text-sm font-medium">
            Credential document
          </span>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center gap-3 rounded-card border border-dashed px-4 py-8 text-center transition-colors duration-150 motion-reduce:transition-none ${
              dragging
                ? "border-brand-800 bg-sage/50"
                : errors.file
                  ? "border-danger-text"
                  : "border-input-border"
            }`}
          >
            {selected ? (
              <>
                <DocumentIcon className="size-8 text-brand-800" />
                <p id="credential-file-selected" className="break-all text-text">
                  <span className="font-medium">{selected.name}</span>
                  <span className="text-text-muted"> · {formatFileSize(selected.size)}</span>
                </p>
              </>
            ) : (
              <>
                <UploadIcon className="size-8 text-brand-800" />
                <p>Drag a file here, or choose a file</p>
              </>
            )}
            <input
              ref={inputRef}
              id="credential-file"
              name="file"
              type="file"
              accept={ACCEPT}
              data-testid="credential-upload-input"
              aria-labelledby="credential-file-label"
              aria-describedby={describedBy(
                Boolean(selected) && "credential-file-selected",
                "credential-file-hint",
                Boolean(errors.file) && "credential-file-error",
              )}
              aria-invalid={errors.file ? true : undefined}
              disabled={pending}
              onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
              className="peer sr-only"
            />
            <label
              htmlFor="credential-file"
              className="flex h-11 cursor-pointer items-center rounded-control border border-brand-800 bg-surface px-5 font-medium text-brand-800 hover:bg-surface-subtle peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
            >
              {selected ? "Choose a different file" : "Choose file"}
            </label>
            <p id="credential-file-hint" className="text-sm text-text-muted">
              PDF, JPG or PNG <span aria-hidden="true">·</span> Up to 4 MB
            </p>
          </div>
          {errors.file ? (
            <p id="credential-file-error" className="text-sm text-danger-text">
              {errors.file}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="credential-expiry" className="text-sm font-medium">
            Expiry date
          </label>
          <input
            ref={expiryRef}
            id="credential-expiry"
            name="expiresOn"
            type="date"
            min={today}
            required
            data-testid="credential-expiry-date-input"
            aria-invalid={errors.expiresOn ? true : undefined}
            aria-describedby={describedBy(
              "credential-expiry-hint",
              Boolean(errors.expiresOn) && "credential-expiry-error",
            )}
            disabled={pending}
            onChange={clearExpiryError}
            className={fieldClass}
          />
          <p id="credential-expiry-hint" className="text-sm text-text-muted">
            Use the expiry date printed on your document.
          </p>
          {errors.expiresOn ? (
            <p id="credential-expiry-error" className="text-sm text-danger-text">
              {errors.expiresOn}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-border pt-5">
          <LockIcon className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Your document is stored privately.</p>
            <p className="mt-1 text-sm text-text-muted">
              Expiry checks use the date you provide. Uploading a document does not verify its
              authenticity.
            </p>
          </div>
        </div>

        {notice ? (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            data-testid="notification-banner"
            className={`flex items-center justify-between gap-4 rounded-control px-4 py-3 text-sm font-medium ${
              notice.kind === "error"
                ? "bg-danger-bg text-danger-text"
                : "bg-success-bg text-success-text"
            }`}
          >
            {notice.message}
            <button
              type="button"
              onClick={dismissNotice}
              className="h-11 shrink-0 rounded-control px-3 hover:bg-black/5"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-control bg-brand-800 px-5 font-medium text-on-brand hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save credential"}
        </button>
      </form>
    </section>
  );
}

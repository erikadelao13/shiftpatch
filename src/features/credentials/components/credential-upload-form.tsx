"use client";

import { useLayoutEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { z } from "zod";

import { formatDate } from "@/contracts/shifts/schedule";
import { useServerRefresh } from "@/shared/client/use-server-refresh";
import { apiFetch } from "@/shared/client/api-client";
import { DocumentIcon, LockIcon, UploadIcon } from "@/shared/ui/icons";

import { PAST_EXPIRY_MESSAGE, formatFileSize } from "@/contracts/credentials/document";
import {
  credentialFileSchema,
  credentialUploadSchema,
  type CredentialUploadErrors,
} from "@/contracts/credentials/schemas";

type Notice = { kind: "success" | "error"; message: string };

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const fieldClass =
  "h-11 w-full rounded-control border border-input-border bg-surface px-3 text-base aria-[invalid=true]:border-danger-text disabled:bg-surface-subtle";

function describedBy(...ids: (string | false)[]): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined;
}

export function CredentialUploadForm({ today }: { today: string }) {
  const { refresh } = useServerRefresh();
  const fileRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [selected, setSelected] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<CredentialUploadErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState(false);

  useLayoutEffect(() => {
    return () => setNotice(null);
  }, []);

  function selectFile(file: File | null) {
    setSelected(file);
    setNotice(null);
    const parsed = file ? credentialFileSchema.safeParse(file) : null;
    setErrors((current) => ({
      ...current,
      file: parsed && !parsed.success ? parsed.error.issues[0]?.message : undefined,
    }));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    const input = fileRef.current;
    if (!file || !input || pending) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    selectFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const parsed = credentialUploadSchema.safeParse({
      file: data.get("file"),
      expiresOn: data.get("expiresOn"),
    });
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);
      setErrors({ file: fieldErrors.file?.[0], expiresOn: fieldErrors.expiresOn?.[0] });
      setNotice(null);
      (fieldErrors.file ? fileRef : expiryRef).current?.focus();
      return;
    }

    if (parsed.data.expiresOn < today) {
      setErrors({ expiresOn: PAST_EXPIRY_MESSAGE });
      setNotice(null);
      expiryRef.current?.focus();
      return;
    }

    setErrors({});
    setNotice(null);
    setPending(true);
    try {
      await apiFetch("/api/credentials", { method: "POST", body: data });
      await refresh();
      setFormKey((key) => key + 1);
      setSelected(null);
      setNotice({
        kind: "success",
        message: `Credential saved. Your expiry date is now ${formatDate(parsed.data.expiresOn)}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save your credential.",
      });
    } finally {
      setPending(false);
    }
  }

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
            onDragOver={(event) => {
              event.preventDefault();
              if (!pending) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
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
              ref={fileRef}
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
            onChange={() => setErrors((current) => ({ ...current, expiresOn: undefined }))}
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
              onClick={() => setNotice(null)}
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

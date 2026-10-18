"use client";

import { useEffect, useRef, useState } from "react";

import { CloseIcon, InfoIcon } from "@/shared/ui/icons";

import { formatDate, formatTimeRange } from "../schedule";
import type { AgencyShift } from "../types";

export type ReopenVariant = "cancel" | "no-show";

export type ReopenTarget = Pick<AgencyShift, "id" | "role" | "date" | "startTime" | "endTime"> & {
  agencyName: string;
  nurseName: string | null;
};

type ReopenShiftDialogProps = {
  variant: ReopenVariant;
  shift: ReopenTarget | null;
  onClose: () => void;
  onConfirm: (shift: ReopenTarget) => Promise<void>;
};

const COPY = {
  cancel: {
    title: "Cancel this assignment?",
    description: () => "You’ll be removed from this shift so another nurse can claim it.",
    consequence: () => "The shift will reopen as available.",
    keep: "Keep assignment",
    confirm: "Cancel assignment",
    confirming: "Cancelling…",
    failure: "Could not cancel this assignment.",
  },
  "no-show": {
    title: "Report a no-show?",
    description: (nurse: string) => `Confirm that ${nurse} did not attend this shift.`,
    consequence: (nurse: string) => `${nurse} will be unassigned and the shift will reopen.`,
    keep: "Go back",
    confirm: "Report no-show",
    confirming: "Reporting…",
    failure: "Could not report the no-show.",
  },
} as const;

export function ReopenShiftDialog({ variant, shift, onClose, onConfirm }: ReopenShiftDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[variant];
  const nurse = shift?.nurseName ?? "The nurse";
  const open = shift !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!shift || pending) return;
    setError(null);
    setPending(true);
    try {
      await onConfirm(shift);
      dialogRef.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : copy.failure);
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reopen-shift-title"
      aria-describedby="reopen-shift-description"
      onClose={handleClose}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) dialogRef.current?.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card bg-surface p-0 text-text shadow-[0_16px_48px_rgb(20_62_50/14%)] backdrop:bg-brand-900/40"
    >
      {shift ? (
        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="reopen-shift-title" className="font-display text-3xl leading-[1.15]">
                {copy.title}
              </h2>
              <p id="reopen-shift-description" className="mt-2 text-text-muted">
                {copy.description(nurse)}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-control hover:bg-surface-subtle disabled:opacity-60"
            >
              <CloseIcon />
            </button>
          </div>

          {error ? (
            <div
              role="alert"
              data-testid="notification-banner"
              className="rounded-control bg-danger-bg px-4 py-3 text-sm font-medium text-danger-text"
            >
              {error}
            </div>
          ) : null}

          <dl className="flex flex-col gap-1 rounded-control border border-border bg-canvas px-4 py-3">
            <dt className="sr-only">Shift</dt>
            <dd className="font-medium">
              {shift.role} · {shift.agencyName}
            </dd>
            <dt className="sr-only">Date</dt>
            <dd className="tabular-nums text-text-muted">{formatDate(shift.date)}</dd>
            <dt className="sr-only">Time</dt>
            <dd className="tabular-nums text-text-muted">
              {formatTimeRange(shift)} · Facility-local time
            </dd>
            {variant === "no-show" ? (
              <>
                <dt className="sr-only">Assigned nurse</dt>
                <dd>
                  <span className="text-text-muted">Assigned nurse: </span>
                  <span className="font-medium">{nurse}</span>
                </dd>
              </>
            ) : null}
          </dl>

          {variant === "cancel" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="reopen-reason" className="text-sm font-medium">
                Cancellation reason
              </label>
              <input
                id="reopen-reason"
                type="text"
                readOnly
                value="In advance"
                className="h-11 w-full rounded-control border border-input-border bg-surface-subtle px-3 text-base"
              />
            </div>
          ) : null}

          <p className="flex items-center gap-2 text-sm text-text-muted">
            <InfoIcon className="size-5 shrink-0" />
            {copy.consequence(nurse)}
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              className="h-12 rounded-control sm:flex-1 border border-brand-800 bg-surface px-5 font-medium text-brand-800 hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.keep}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleConfirm}
              className="h-12 rounded-control sm:flex-1 bg-danger-text px-5 font-medium text-white hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? copy.confirming : copy.confirm}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

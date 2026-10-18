"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { CloseIcon } from "@/shared/ui/icons";

import { validateNewShift, type NewShiftErrors } from "../schedule";
import { SHIFT_ROLES, type NewShiftInput, type ShiftRole } from "../types";

type PostShiftDialogProps = {
  open: boolean;
  agencyName: string;
  onClose: () => void;
  onPost: (shift: NewShiftInput) => void;
};

const fieldClass =
  "h-11 w-full rounded-control border border-input-border bg-surface px-3 text-base aria-[invalid=true]:border-danger-text";

export function PostShiftDialog({ open, agencyName, onClose, onPost }: PostShiftDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [errors, setErrors] = useState<NewShiftErrors>({});
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClose() {
    setErrors({});
    setFormKey((key) => key + 1);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: NewShiftInput = {
      role: data.get("role") as ShiftRole,
      date: String(data.get("date") ?? ""),
      startTime: String(data.get("startTime") ?? ""),
      endTime: String(data.get("endTime") ?? ""),
    };

    const found = validateNewShift(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onPost(input);
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="post-shift-title"
      onClose={handleClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-md bg-surface text-text shadow-[0_16px_48px_rgb(20_62_50/14%)] backdrop:bg-brand-900/40"
    >
      <form
        key={formKey}
        onSubmit={handleSubmit}
        noValidate
        className="flex min-h-full flex-col"
      >
        <div className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="post-shift-title" className="font-display text-3xl leading-[1.15]">
                Post a shift
              </h2>
              <p className="mt-2 text-text-muted">Add an opening to your agency&apos;s schedule.</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-control hover:bg-surface-subtle"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="post-agency" className="text-sm font-medium">
              Agency
            </label>
            <input
              id="post-agency"
              type="text"
              readOnly
              value={agencyName}
              className={`${fieldClass} bg-surface-subtle`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="post-role" className="text-sm font-medium">
              Role
            </label>
            <select id="post-role" name="role" defaultValue="RN" className={fieldClass}>
              {SHIFT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="post-date" className="text-sm font-medium">
              Date
            </label>
            <input
              id="post-date"
              name="date"
              type="date"
              required
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={errors.date ? "post-date-error" : undefined}
              className={fieldClass}
            />
            {errors.date ? (
              <p id="post-date-error" className="text-sm text-danger-text">
                {errors.date}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="post-start" className="text-sm font-medium">
                Start time
              </label>
              <input
                id="post-start"
                name="startTime"
                type="time"
                required
                defaultValue="07:00"
                aria-invalid={errors.startTime ? true : undefined}
                aria-describedby={errors.startTime ? "post-start-error" : undefined}
                className={fieldClass}
              />
              {errors.startTime ? (
                <p id="post-start-error" className="text-sm text-danger-text">
                  {errors.startTime}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="post-end" className="text-sm font-medium">
                End time
              </label>
              <input
                id="post-end"
                name="endTime"
                type="time"
                required
                defaultValue="19:00"
                aria-invalid={errors.endTime ? true : undefined}
                aria-describedby={errors.endTime ? "post-end-error post-time-hint" : "post-time-hint"}
                className={fieldClass}
              />
              {errors.endTime ? (
                <p id="post-end-error" className="text-sm text-danger-text">
                  {errors.endTime}
                </p>
              ) : null}
            </div>
          </div>
          <p id="post-time-hint" className="-mt-2 text-sm text-text-muted">
            An end time earlier than the start time ends the next day.
          </p>

          <p className="text-sm text-text-muted">New shifts start as open.</p>
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-11 rounded-control border border-brand-800 bg-surface px-5 font-medium text-brand-800 hover:bg-surface-subtle"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="agency-post-shift-submit-button"
            className="h-11 rounded-control bg-brand-800 px-5 font-medium text-on-brand hover:bg-brand-900"
          >
            Post a shift
          </button>
        </div>
      </form>
    </dialog>
  );
}

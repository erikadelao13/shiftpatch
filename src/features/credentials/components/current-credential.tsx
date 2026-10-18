import { formatDate } from "@/features/shifts/schedule";
import { ShieldCheckIcon } from "@/shared/ui/icons";

import type { CredentialStatus } from "../status";

const BADGES = {
  valid: { label: "Valid", className: "bg-success-bg text-success-text" },
  expired: { label: "Expired", className: "bg-danger-bg text-danger-text" },
  missing: { label: "Not on file", className: "bg-warning-bg text-warning-text" },
} as const;

export function CurrentCredential({ status }: { status: CredentialStatus }) {
  const badge = BADGES[status.state];

  return (
    <section
      aria-labelledby="current-credential-title"
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 id="current-credential-title" className="font-display text-2xl leading-tight">
        Current credential
      </h2>

      <div className="flex items-center gap-3">
        <ShieldCheckIcon className="size-6 shrink-0 text-brand-800" />
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <dl className="divide-y divide-border border-t border-border text-sm">
        <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-4">
          <dt className="text-text-muted">Expiry date</dt>
          <dd className="font-medium tabular-nums">
            {status.state === "missing" ? "Not on file" : formatDate(status.expiresOn)}
          </dd>
        </div>
        <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-4">
          <dt className="text-text-muted">Document</dt>
          <dd>No document uploaded</dd>
        </div>
      </dl>

      <p className="-mt-2 text-sm text-text-muted">
        {status.state === "missing"
          ? "Upload your document and its expiry date to start claiming shifts."
          : "Your record has an expiry date but no document yet. Upload one to complete it."}
      </p>

      <div className="rounded-card bg-sage px-5 py-4">
        <h3 className="font-display text-lg leading-snug">Before you claim a shift</h3>
        <p className="mt-1 text-sm text-text-muted">
          Expired credentials block new shift claims. Saving an updated expiry date updates your
          eligibility.
        </p>
      </div>
    </section>
  );
}

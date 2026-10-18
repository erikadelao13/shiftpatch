import { ShieldCheckIcon } from "@/shared/ui/icons";
import { formatDate } from "@/features/shifts/schedule";

import type { CredentialStatus } from "../status";

const TONES = {
  valid: "bg-sage text-brand-800",
  expired: "bg-danger-bg text-danger-text",
  missing: "bg-warning-bg text-warning-text",
} as const;

function describe(status: CredentialStatus): { title: string; detail: string } {
  switch (status.state) {
    case "valid":
      return {
        title: "Credentials valid",
        detail: `Expires ${formatDate(status.expiresOn)}`,
      };
    case "expired":
      return {
        title: "Credentials expired",
        detail: `Expired ${formatDate(status.expiresOn)}. Claims are rejected until your credentials are renewed.`,
      };
    case "missing":
      return {
        title: "No credentials on file",
        detail: "Claims are rejected until your credentials are added.",
      };
  }
}

export function CredentialBanner({ status }: { status: CredentialStatus }) {
  const { title, detail } = describe(status);

  return (
    <section
      aria-label="Credential status"
      data-testid="credential-status"
      data-state={status.state}
      className={`flex items-center gap-4 rounded-card px-5 py-4 sm:px-6 ${TONES[status.state]}`}
    >
      <ShieldCheckIcon className="size-7 shrink-0" />
      <div>
        <p className="font-medium leading-snug">{title}</p>
        <p className="text-sm">{detail}</p>
      </div>
    </section>
  );
}

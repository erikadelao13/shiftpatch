import type { ShiftStatus } from "../types";

const BADGES: Record<ShiftStatus, { label: string; className: string; dot: string }> = {
  open: {
    label: "Open",
    className: "bg-warning-bg text-warning-text",
    dot: "bg-warning-text",
  },
  filled: {
    label: "Filled",
    className: "bg-success-bg text-success-text",
    dot: "bg-success-text",
  },
};

export function StatusBadge({ status }: { status: ShiftStatus }) {
  const badge = BADGES[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${badge.className}`}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${badge.dot}`} />
      {badge.label}
    </span>
  );
}

import type { AgencyShift, CancellationReason } from "@/contracts/shifts/types";

export type ReopenMode = "nurse" | "agency";

export type ReopenTarget = Pick<AgencyShift, "id" | "role" | "date" | "startTime" | "endTime"> & {
  agencyName: string;
  nurseName: string | null;
};

export const REASON_LABELS: Record<CancellationReason, string> = {
  advance: "In advance",
  "no-show": "No-show",
};

export const REASON_COPY = {
  advance: {
    description: (nurse: string) => `Confirm that ${nurse} is being removed from this shift in advance.`,
    confirm: "Cancel assignment",
    confirming: "Cancelling…",
    failure: "Could not cancel this assignment.",
  },
  "no-show": {
    description: (nurse: string) => `Confirm that ${nurse} did not attend this shift.`,
    confirm: "Report no-show",
    confirming: "Reporting…",
    failure: "Could not report the no-show.",
  },
} as const;

export const NURSE_COPY = {
  title: "Cancel this assignment?",
  description: "You’ll be removed from this shift so another nurse can claim it.",
  consequence: "The shift will reopen as available.",
  keep: "Keep assignment",
} as const;

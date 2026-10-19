import { formatDate } from "@/contracts/shifts/schedule";

import type { AuditEntry } from "./types";

export type AuditEventIcon = "posted" | "claimed" | "cancelled" | "no-show" | "credential";

export type AuditEventDescription = {
  icon: AuditEventIcon;
  label: string;
  details: string[];
};

const REOPENED = "Filled → Open";

export function describeAuditEvent(entry: AuditEntry): AuditEventDescription {
  switch (entry.action) {
    case "shift_posted":
      return {
        icon: "posted",
        label: "Shift posted",
        details: [entry.shift.role, formatDate(entry.shift.date), "Open"],
      };
    case "shift_claimed":
      return { icon: "claimed", label: "Shift claimed", details: ["Open → Filled"] };
    case "shift_cancelled": {
      const unassigned =
        entry.previousNurse.id === entry.actor.id ? [] : [`${entry.previousNurse.name} unassigned`];
      return entry.reason === "no-show"
        ? { icon: "no-show", label: "No-show reported", details: [...unassigned, REOPENED] }
        : {
            icon: "cancelled",
            label: "Assignment cancelled",
            details: ["In advance", ...unassigned, REOPENED],
          };
    }
    case "credential_updated": {
      const expiry = formatDate(entry.expiresOn);
      return entry.previousExpiresOn
        ? {
            icon: "credential",
            label: "Credential replaced",
            details: [`Expiry: ${formatDate(entry.previousExpiresOn)} → ${expiry}`],
          }
        : { icon: "credential", label: "Credential added", details: [`Expiry: ${expiry}`] };
    }
  }
}

export function formatEventTime(occurredAt: string): { date: string; time: string } {
  return { date: formatDate(occurredAt.slice(0, 10)), time: occurredAt.slice(11, 16) };
}

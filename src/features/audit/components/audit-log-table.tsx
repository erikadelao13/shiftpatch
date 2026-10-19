import type { ReactNode } from "react";

import type { Role } from "@/contracts/auth/types";
import {
  AlertTriangleIcon,
  CircleXIcon,
  DocumentIcon,
  NoteIcon,
  UserIcon,
} from "@/shared/ui/icons";

import { describeAuditEvent, formatEventTime, type AuditEventIcon } from "@/contracts/audit/describe-event";
import type { AuditEntry } from "@/contracts/audit/types";

const ACTION_ICONS: Record<AuditEventIcon, ReactNode> = {
  posted: <NoteIcon />,
  claimed: <UserIcon />,
  cancelled: <CircleXIcon />,
  "no-show": <AlertTriangleIcon />,
  credential: <DocumentIcon />,
};

const ACTOR_ROLES: Record<Role, { label: string; avatar: string }> = {
  nurse: { label: "Nurse", avatar: "bg-info-bg text-info-text" },
  agency: { label: "Agency", avatar: "bg-sage text-brand-800" },
  admin: { label: "Administrator", avatar: "bg-neutral-bg text-neutral-text" },
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function AuditLogTable({ entries }: { entries: readonly AuditEntry[] }) {
  return (
    <table data-testid="audit-log-table" className="w-full text-left text-sm">
      <thead className="hidden border-b border-border text-text-muted xl:table-header-group">
        <tr>
          <th scope="col" className="py-3 pr-4 pl-2 font-medium">When</th>
          <th scope="col" className="px-4 py-3 font-medium">Actor</th>
          <th scope="col" className="px-4 py-3 font-medium">Action</th>
          <th scope="col" className="px-4 py-3 font-medium">Record</th>
          <th scope="col" className="py-3 pr-2 pl-4 font-medium">Details</th>
        </tr>
      </thead>
      <tbody className="block divide-y divide-border xl:table-row-group">
        {entries.map((entry) => {
          const when = formatEventTime(entry.occurredAt);
          const event = describeAuditEvent(entry);
          const actorRole = ACTOR_ROLES[entry.actor.role];

          return (
            <tr
              key={entry.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 py-4 xl:table-row xl:hover:bg-surface-subtle xl:h-[76px] xl:py-0"
            >
              <td className="col-start-2 row-start-3 self-center text-right xl:py-3 xl:pr-4 xl:pl-2 xl:text-left">
                <time
                  dateTime={entry.occurredAt}
                  className="flex flex-wrap justify-end gap-x-2 tabular-nums text-text-muted xl:flex-col xl:justify-start"
                >
                  <span className="xl:text-base xl:whitespace-nowrap xl:text-text">{when.date}</span>
                  <span>{when.time}</span>
                </time>
              </td>
              <td className="col-start-1 row-start-3 xl:px-4 xl:py-3">
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${actorRole.avatar}`}
                  >
                    {initialsOf(entry.actor.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base">{entry.actor.name}</span>
                    <span className="block text-text-muted">{actorRole.label}</span>
                  </span>
                </span>
              </td>
              <td className="col-start-1 row-start-1 self-center xl:px-4 xl:py-3">
                <span className="flex items-center gap-3 text-base font-medium xl:font-normal xl:whitespace-nowrap">
                  <span className="shrink-0 text-text">{ACTION_ICONS[event.icon]}</span>
                  {event.label}
                </span>
              </td>
              <td className="col-start-2 row-start-1 self-center justify-self-end xl:px-4 xl:py-3">
                <code className="inline-block max-w-40 rounded-control bg-surface-subtle px-2.5 py-1 font-mono text-[0.8125rem] break-all text-text-muted xl:max-w-44">
                  {entry.recordId}
                </code>
              </td>
              <td className="col-span-2 row-start-2 xl:py-3 xl:pr-2 xl:pl-4 xl:text-base">
                {event.details.join(" · ")}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

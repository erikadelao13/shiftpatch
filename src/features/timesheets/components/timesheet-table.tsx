import { formatDate } from "@/shared/lib/dates";
import { durationHours, formatEndsOn } from "@/shared/lib/shift-time";

import { formatHours } from "@/features/timesheets/lib/hours";
import type { TimesheetEntry, TimesheetEntryState } from "@/contracts/timesheets/types";

type Stacking = {
  head: string;
  body: string;
  row: string;
  first: string;
  cell: string;
  tightCell: string;
  last: string;
  agency: string;
  shift: string;
  nowrap: string;
  label: string;
};

const STACKING: Record<"md" | "xl", Stacking> = {
  md: {
    head: "hidden md:table-header-group",
    body: "block divide-y divide-border md:table-row-group",
    row: "grid grid-cols-2 gap-x-4 gap-y-1 px-5 py-4 hover:bg-surface-subtle md:table-row md:h-20 md:px-0 md:py-0",
    first: "col-span-2 md:px-6 md:py-3",
    cell: "col-span-2 md:px-4 md:py-3",
    tightCell: "mt-3 md:mt-0 md:px-4 md:py-3",
    last: "mt-3 md:mt-0 md:px-6 md:py-3",
    agency: "text-text-muted md:text-text",
    shift: "md:flex-col md:items-start",
    nowrap: "md:whitespace-nowrap",
    label: "block text-text-muted md:hidden",
  },
  xl: {
    head: "hidden xl:table-header-group",
    body: "block divide-y divide-border xl:table-row-group",
    row: "grid grid-cols-2 gap-x-4 gap-y-1 px-5 py-4 hover:bg-surface-subtle xl:table-row xl:h-20 xl:px-0 xl:py-0",
    first: "col-span-2 xl:px-6 xl:py-3",
    cell: "col-span-2 xl:px-4 xl:py-3",
    tightCell: "mt-3 xl:mt-0 xl:px-4 xl:py-3",
    last: "mt-3 xl:mt-0 xl:px-6 xl:py-3",
    agency: "text-text-muted xl:text-text",
    shift: "xl:flex-col xl:items-start",
    nowrap: "xl:whitespace-nowrap",
    label: "block text-text-muted xl:hidden",
  },
};

const STATE_PILLS: Record<TimesheetEntryState, { label: string; classes: string }> = {
  assigned: { label: "Assigned", classes: "bg-success-bg text-success-text" },
  cancelled: { label: "Cancelled", classes: "bg-neutral-bg text-neutral-text" },
  "no-show": { label: "No-show", classes: "bg-danger-bg text-danger-text" },
};

function EntryStatePill({ state }: { state: TimesheetEntryState }) {
  const pill = STATE_PILLS[state];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pill.classes}`}>
      {pill.label}
    </span>
  );
}

type TimesheetTableProps = {
  entries: readonly TimesheetEntry[];
  showAgency: boolean;
  showNurse: boolean;
};

export function TimesheetTable({ entries, showAgency, showNurse }: TimesheetTableProps) {
  const stacking = STACKING[showAgency && showNurse ? "xl" : "md"];

  return (
    <table data-testid="timesheet-table" className="w-full border-t border-border text-left text-sm">
      <thead className={`${stacking.head} bg-surface-subtle text-text-muted`}>
        <tr>
          <th scope="col" className="px-6 py-3 font-medium">Shift</th>
          {showAgency ? <th scope="col" className="px-4 py-3 font-medium">Agency</th> : null}
          {showNurse ? <th scope="col" className="px-4 py-3 font-medium">Nurse</th> : null}
          <th scope="col" className="px-4 py-3 font-medium">Date</th>
          <th scope="col" className="px-4 py-3 font-medium">Scheduled time</th>
          <th scope="col" className="px-4 py-3 font-medium">Scheduled hours</th>
          <th scope="col" className="px-6 py-3 font-medium">Worked hours</th>
        </tr>
      </thead>
      <tbody className={stacking.body}>
        {entries.map((entry) => {
          const endsOn = formatEndsOn(entry);
          const history = entry.state !== "assigned";
          return (
            <tr key={entry.id} className={stacking.row}>
              <td className={stacking.first}>
                <span
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${stacking.shift}`}
                >
                  <span className="text-base font-medium">{entry.role}</span>
                  <EntryStatePill state={entry.state} />
                </span>
              </td>
              {showAgency ? (
                <td className={`${stacking.cell} ${stacking.agency}`}>{entry.agencyName}</td>
              ) : null}
              {showNurse ? (
                <td className={`${stacking.cell} ${stacking.agency}`}>{entry.nurseName}</td>
              ) : null}
              <td className={`${stacking.tightCell} tabular-nums ${stacking.nowrap}`}>
                <span className={stacking.label}>Date</span>
                {formatDate(entry.date)}
              </td>
              <td className={`${stacking.tightCell} tabular-nums ${stacking.nowrap}`}>
                <span className={stacking.label}>Scheduled time</span>
                <p>
                  {entry.startTime}–{entry.endTime}
                </p>
                {endsOn ? <p className="text-text-muted">Ends {endsOn}</p> : null}
              </td>
              <td className={stacking.tightCell}>
                <span className={stacking.label}>Scheduled hours</span>
                <span
                  className={`tabular-nums ${
                    history ? "text-text-muted" : "text-base font-semibold"
                  }`}
                >
                  {formatHours(durationHours(entry))}
                </span>
                {history ? <p className="text-text-muted">Not counted</p> : null}
              </td>
              <td className={stacking.last}>
                <span className={stacking.label}>Worked hours</span>
                <span className="text-text-muted">Not recorded</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

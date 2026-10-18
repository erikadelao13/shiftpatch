import { durationHours, formatDate, formatEndsOn } from "@/features/shifts/schedule";
import type { MarketplaceShift } from "@/features/shifts/types";

import { formatHours } from "../hours";

function MobileLabel({ children }: { children: string }) {
  return <span className="block text-text-muted md:hidden">{children}</span>;
}

export function TimesheetTable({ shifts }: { shifts: readonly MarketplaceShift[] }) {
  return (
    <table data-testid="timesheet-table" className="w-full border-t border-border text-left text-sm">
      <thead className="hidden bg-surface-subtle text-text-muted md:table-header-group">
        <tr>
          <th scope="col" className="px-6 py-3 font-medium">Shift</th>
          <th scope="col" className="px-4 py-3 font-medium">Agency</th>
          <th scope="col" className="px-4 py-3 font-medium">Date</th>
          <th scope="col" className="px-4 py-3 font-medium">Scheduled time</th>
          <th scope="col" className="px-4 py-3 font-medium">Scheduled hours</th>
          <th scope="col" className="px-6 py-3 font-medium">Worked hours</th>
        </tr>
      </thead>
      <tbody className="block divide-y divide-border md:table-row-group">
        {shifts.map((shift) => {
          const endsOn = formatEndsOn(shift);
          return (
            <tr
              key={shift.id}
              className="grid grid-cols-2 gap-x-4 gap-y-1 px-5 py-4 hover:bg-surface-subtle md:table-row md:h-20 md:px-0 md:py-0"
            >
              <td className="col-span-2 md:px-6 md:py-3">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 md:flex-col md:items-start">
                  <span className="text-base font-medium">{shift.role}</span>
                  <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success-text">
                    Assigned
                  </span>
                </span>
              </td>
              <td className="col-span-2 text-text-muted md:px-4 md:py-3 md:text-text">
                {shift.agencyName}
              </td>
              <td className="mt-3 tabular-nums md:mt-0 md:px-4 md:py-3 md:whitespace-nowrap">
                <MobileLabel>Date</MobileLabel>
                {formatDate(shift.date)}
              </td>
              <td className="mt-3 tabular-nums md:mt-0 md:px-4 md:py-3 md:whitespace-nowrap">
                <MobileLabel>Scheduled time</MobileLabel>
                <p>
                  {shift.startTime}–{shift.endTime}
                </p>
                {endsOn ? <p className="text-text-muted">Ends {endsOn}</p> : null}
              </td>
              <td className="mt-3 md:mt-0 md:px-4 md:py-3">
                <MobileLabel>Scheduled hours</MobileLabel>
                <span className="text-base font-semibold tabular-nums">
                  {formatHours(durationHours(shift))}
                </span>
              </td>
              <td className="mt-3 md:mt-0 md:px-6 md:py-3">
                <MobileLabel>Worked hours</MobileLabel>
                <span className="text-text-muted">Not recorded</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

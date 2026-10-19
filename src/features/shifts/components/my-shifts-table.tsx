import { formatDate, formatEndsOn } from "@/contracts/shifts/schedule";
import type { MarketplaceShift } from "@/contracts/shifts/types";

type MyShiftsTableProps = {
  shifts: readonly MarketplaceShift[];
  onCancel: (shift: MarketplaceShift) => void;
};

export function MyShiftsTable({ shifts, onCancel }: MyShiftsTableProps) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="hidden bg-surface-subtle text-text-muted md:table-header-group">
        <tr>
          <th scope="col" className="px-6 py-3 font-medium">Shift</th>
          <th scope="col" className="px-4 py-3 font-medium">Date</th>
          <th scope="col" className="px-4 py-3 font-medium">Time</th>
          <th scope="col" className="px-4 py-3 font-medium">Status</th>
          <th scope="col" className="px-6 py-3 text-right font-medium">
            <span className="sr-only">Action</span>
          </th>
        </tr>
      </thead>
      <tbody className="block divide-y divide-border md:table-row-group">
        {shifts.map((shift) => {
          const endsOn = formatEndsOn(shift);
          return (
            <tr
              key={shift.id}
              className="flex flex-col gap-2 px-5 py-4 hover:bg-surface-subtle md:table-row md:h-20 md:px-0 md:py-0"
            >
              <td className="md:px-6 md:py-3">
                <p className="text-base font-medium">{shift.role}</p>
                <p className="text-text-muted">{shift.agencyName}</p>
              </td>
              <td className="tabular-nums md:px-4 md:py-3">{formatDate(shift.date)}</td>
              <td className="tabular-nums md:px-4 md:py-3">
                <p>
                  {shift.startTime}–{shift.endTime}
                </p>
                {endsOn ? <p className="text-text-muted">Ends {endsOn}</p> : null}
              </td>
              <td className="md:px-4 md:py-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3 py-1 font-medium text-success-text">
                  <span aria-hidden="true" className="size-2 rounded-full bg-success-text" />
                  Assigned to you
                </span>
              </td>
              <td className="md:px-6 md:py-3 md:text-right">
                <button
                  type="button"
                  data-testid="shift-cancel-button"
                  aria-label={`Cancel ${shift.role} shift on ${formatDate(shift.date)} with ${shift.agencyName}`}
                  onClick={() => onCancel(shift)}
                  className="h-11 w-full rounded-control border border-input-border bg-surface px-4 font-medium hover:bg-surface-subtle md:w-auto"
                >
                  Cancel shift
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

import { formatDate, formatEndsOn } from "@/contracts/shifts/schedule";
import type { MarketplaceShift } from "@/contracts/shifts/types";
import { StatusBadge } from "./status-badge";

type OpenShiftsTableProps = {
  shifts: readonly MarketplaceShift[];
  claimingId: string | null;
  busy: boolean;
  onClaim: (shift: MarketplaceShift) => void;
};

export function OpenShiftsTable({ shifts, claimingId, busy, onClaim }: OpenShiftsTableProps) {
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
          const claiming = claimingId === shift.id;
          return (
            <tr
              key={shift.id}
              data-testid="shift-list-item"
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
                <StatusBadge status="open" />
              </td>
              <td className="md:px-6 md:py-3 md:text-right">
                <button
                  type="button"
                  data-testid="shift-claim-button"
                  disabled={busy}
                  aria-label={`Claim ${shift.role} shift on ${formatDate(shift.date)} with ${shift.agencyName}`}
                  onClick={() => onClaim(shift)}
                  className="h-11 w-full rounded-control bg-brand-800 px-5 font-medium text-on-brand hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {claiming ? "Claiming…" : "Claim shift"}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

import { formatDate } from "@/shared/lib/dates";
import { formatTimeRange } from "@/features/shifts/lib/schedule";
import type { AgencyShift } from "@/contracts/shifts/types";
import { AssignedNurse } from "./assigned-nurse";
import { StatusBadge } from "./status-badge";

type ShiftsTableProps = {
  shifts: readonly AgencyShift[];
  agencyName: string;
  emptyMessage: string;
  onCancel: (shift: AgencyShift) => void;
};

function CancelShiftButton({
  shift,
  onCancel,
  className,
}: {
  shift: AgencyShift;
  onCancel: (shift: AgencyShift) => void;
  className?: string;
}) {
  if (shift.status !== "filled") return null;
  return (
    <button
      type="button"
      data-testid="shift-cancel-button"
      aria-label={`Cancel ${shift.role} shift on ${formatDate(shift.date)} for ${shift.nurseName ?? "the assigned nurse"}`}
      onClick={() => onCancel(shift)}
      className={`h-11 rounded-control border border-input-border bg-surface px-4 font-medium hover:bg-surface-subtle ${className ?? ""}`}
    >
      Cancel shift
    </button>
  );
}

export function ShiftsTable({ shifts, agencyName, emptyMessage, onCancel }: ShiftsTableProps) {
  if (shifts.length === 0) {
    return <p className="px-5 py-10 text-center text-text-muted sm:px-6">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-subtle text-text-muted">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium">Shift</th>
              <th scope="col" className="px-4 py-3 font-medium">Date &amp; time</th>
              <th scope="col" className="px-4 py-3 font-medium">Assigned nurse</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-6 py-3 text-right font-medium">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shifts.map((shift) => (
              <tr key={shift.id} className="h-20 hover:bg-surface-subtle">
                <td className="px-6 py-3">
                  <p className="font-medium">{shift.role}</p>
                  <p className="text-text-muted">{agencyName}</p>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  <p>{formatDate(shift.date)}</p>
                  <p className="text-text-muted">{formatTimeRange(shift)}</p>
                </td>
                <td className="px-4 py-3">
                  <AssignedNurse name={shift.nurseName} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={shift.status} />
                </td>
                <td className="px-6 py-3 text-right">
                  <CancelShiftButton shift={shift} onCancel={onCancel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {shifts.map((shift) => (
          <li key={shift.id} className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{shift.role}</p>
                <p className="text-sm text-text-muted">{agencyName}</p>
              </div>
              <StatusBadge status={shift.status} />
            </div>
            <p className="text-sm tabular-nums">
              {formatDate(shift.date)}
              <span className="text-text-muted"> · {formatTimeRange(shift)}</span>
            </p>
            <div className="text-sm">
              <AssignedNurse name={shift.nurseName} />
            </div>
            <CancelShiftButton shift={shift} onCancel={onCancel} className="w-full" />
          </li>
        ))}
      </ul>
    </>
  );
}

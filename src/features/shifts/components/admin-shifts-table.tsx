import { formatDate, formatTimeRange } from "../schedule";
import type { AdminShift } from "../types";
import { AssignedNurse } from "./assigned-nurse";
import { StatusBadge } from "./status-badge";

export function AdminShiftsTable({ shifts }: { shifts: readonly AdminShift[] }) {
  return (
    <table data-testid="admin-dashboard-shift-table" className="w-full text-left text-sm">
      <thead className="hidden bg-surface-subtle text-text-muted md:table-header-group">
        <tr>
          <th scope="col" className="px-6 py-3 font-medium">Shift</th>
          <th scope="col" className="px-4 py-3 font-medium">Agency</th>
          <th scope="col" className="px-4 py-3 font-medium">Date &amp; time</th>
          <th scope="col" className="px-4 py-3 font-medium">Assigned nurse</th>
          <th scope="col" className="px-6 py-3 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="block divide-y divide-border md:table-row-group">
        {shifts.map((shift) => (
          <tr
            key={shift.id}
            className="flex flex-col gap-2 px-5 py-4 hover:bg-surface-subtle md:table-row md:h-20 md:px-0 md:py-0"
          >
            <td className="md:px-6 md:py-3">
              <p className="text-base font-medium">{shift.role}</p>
              <p className="break-all text-text-muted">{shift.id}</p>
            </td>
            <td className="md:px-4 md:py-3">{shift.agencyName}</td>
            <td className="tabular-nums md:px-4 md:py-3">
              <p>{formatDate(shift.date)}</p>
              <p className="text-text-muted">{formatTimeRange(shift)}</p>
            </td>
            <td className="md:px-4 md:py-3">
              <AssignedNurse name={shift.nurseName} />
            </td>
            <td className="md:px-6 md:py-3">
              <StatusBadge status={shift.status} testId="admin-shift-status-badge" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

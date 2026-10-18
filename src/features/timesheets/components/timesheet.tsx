"use client";

import Link from "next/link";
import { useState } from "react";

import { StatCard } from "@/features/shifts/components/stat-card";
import type { MarketplaceShift } from "@/features/shifts/types";
import { useServerRefresh } from "@/features/shifts/use-server-refresh";
import { ClockIcon, RefreshIcon } from "@/shared/ui/icons";

import { formatHours, totalScheduledHours } from "../hours";
import { TimesheetTable } from "./timesheet-table";

function assignedShiftCount(count: number): string {
  return `${count} assigned ${count === 1 ? "shift" : "shifts"}`;
}

export function Timesheet({ shifts }: { shifts: MarketplaceShift[] }) {
  const { refresh, refreshing } = useServerRefresh();
  const [announcement, setAnnouncement] = useState("");
  const scheduledHours = formatHours(totalScheduledHours(shifts));

  async function refreshFromButton() {
    setAnnouncement("");
    await refresh();
    setAnnouncement("Timesheet refreshed.");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
          Workspace <span aria-hidden="true">/</span>{" "}
          <span aria-current="page">Timesheets</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="font-display text-[2.25rem] leading-[1.12] text-brand-800 md:text-5xl">
              Your shifts. Your hours.
            </h1>
            <p className="mt-2 text-lg text-text-muted">
              Review your assignments and scheduled time.
            </p>
          </div>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refreshFromButton()}
            className="flex h-11 items-center gap-2 rounded-control border border-input-border bg-surface px-4 font-medium hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Assigned shifts" value={String(shifts.length)} />
        <StatCard label="Scheduled hours" value={scheduledHours} />
        <StatCard label="Recorded work hours" value="—" note="No work hours recorded" />
      </section>

      <section
        aria-labelledby="shift-hours-title"
        className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-5 pt-6 pb-5 sm:px-6">
          <div>
            <h2 id="shift-hours-title" className="font-display text-2xl leading-tight">
              Shift hours
            </h2>
            <p className="mt-1 text-text-muted">Scheduled time for your assigned shifts</p>
          </div>
          <p className="text-sm text-text-muted">All dates · Facility-local time</p>
        </div>

        {shifts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-border px-5 py-10 text-center sm:px-6">
            <p className="text-text-muted">You have no assigned shifts yet.</p>
            <Link
              href="/nurse"
              className="flex h-11 items-center rounded-control border border-brand-800 bg-surface px-4 font-medium text-brand-800 hover:bg-surface-subtle"
            >
              Browse open shifts
            </Link>
          </div>
        ) : (
          <TimesheetTable shifts={shifts} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 text-sm text-text-muted sm:px-6">
          <p>{assignedShiftCount(shifts.length)}</p>
          <p>
            Total scheduled:{" "}
            <span className="font-semibold text-text tabular-nums">{scheduledHours}</span>
          </p>
        </div>
      </section>

      <aside className="flex items-center gap-4 rounded-card bg-sage px-5 py-4 sm:px-6">
        <ClockIcon className="size-8 shrink-0 text-brand-800" />
        <div>
          <p className="font-display text-lg leading-snug text-brand-800">
            Scheduled time is planned time.
          </p>
          <p className="text-sm text-text-muted">
            Worked hours have not been recorded. Scheduled hours do not confirm attendance.
          </p>
        </div>
      </aside>

      <p className="text-sm text-text-muted">
        Cancelled assignments and no-shows are excluded from scheduled totals.
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Role } from "@/features/auth/types";
import { StatCard } from "@/features/shifts/components/stat-card";
import { useServerRefresh } from "@/features/shifts/use-server-refresh";
import { ClockIcon, RefreshIcon } from "@/shared/ui/icons";

import { formatHours, timesheetTotals } from "../hours";
import type { TimesheetEntry } from "../types";
import { TimesheetTable } from "./timesheet-table";

function assignedShiftCount(count: number): string {
  return `${count} assigned ${count === 1 ? "shift" : "shifts"}`;
}

type Copy = {
  heading: string;
  subheading: string;
  panelSubtitle: string;
  emptyMessage: string;
  showBrowseLink: boolean;
};

const COPY: Record<Role, Copy> = {
  nurse: {
    heading: "Your shifts. Your hours.",
    subheading: "Review your assignments and scheduled time.",
    panelSubtitle: "Scheduled time for your assigned shifts",
    emptyMessage: "You have no assigned shifts yet.",
    showBrowseLink: true,
  },
  agency: {
    heading: "Every assignment, accounted for.",
    subheading: "Review scheduled time for your agency's shifts.",
    panelSubtitle: "Scheduled time for your agency's shifts",
    emptyMessage: "No nurse has claimed one of your shifts yet.",
    showBrowseLink: false,
  },
  admin: {
    heading: "Hours across every agency.",
    subheading: "Review assignments and scheduled time for both agencies.",
    panelSubtitle: "Scheduled time for every agency's shifts",
    emptyMessage: "No shifts have been claimed yet.",
    showBrowseLink: false,
  },
};

export function Timesheet({ audience, entries }: { audience: Role; entries: TimesheetEntry[] }) {
  const { refresh, refreshing } = useServerRefresh();
  const [announcement, setAnnouncement] = useState("");
  const refreshingRef = useRef(refreshing);
  const copy = COPY[audience];
  const totals = timesheetTotals(entries);
  const scheduledHours = formatHours(totals.scheduledHours);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    if (audience !== "admin") return;
    function refreshOnReturn() {
      if (document.visibilityState === "visible" && !refreshingRef.current) void refresh();
    }
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => document.removeEventListener("visibilitychange", refreshOnReturn);
  }, [audience, refresh]);

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
              {copy.heading}
            </h1>
            <p className="mt-2 text-lg text-text-muted">{copy.subheading}</p>
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
        <StatCard label="Assigned shifts" value={String(totals.assigned)} />
        <StatCard label="Scheduled hours" value={scheduledHours} />
        <StatCard
          label="Cancelled or no-show"
          value={String(totals.history)}
          note="Not counted in scheduled hours"
        />
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
            <p className="mt-1 text-text-muted">{copy.panelSubtitle}</p>
          </div>
          <p className="text-sm text-text-muted">All dates · Facility-local time</p>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-border px-5 py-10 text-center sm:px-6">
            <p className="text-text-muted">{copy.emptyMessage}</p>
            {copy.showBrowseLink ? (
              <Link
                href="/nurse"
                className="flex h-11 items-center rounded-control border border-brand-800 bg-surface px-4 font-medium text-brand-800 hover:bg-surface-subtle"
              >
                Browse open shifts
              </Link>
            ) : null}
          </div>
        ) : (
          <TimesheetTable
            entries={entries}
            showAgency={audience !== "agency"}
            showNurse={audience !== "nurse"}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 text-sm text-text-muted sm:px-6">
          <p>
            {assignedShiftCount(totals.assigned)}
            {totals.history > 0 ? ` · ${totals.history} cancelled or no-show` : ""}
          </p>
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
        Cancelled and no-show rows stay listed as history and are not counted in the totals.
      </p>
    </div>
  );
}

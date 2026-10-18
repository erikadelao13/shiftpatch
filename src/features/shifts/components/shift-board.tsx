"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { ShieldCheckIcon } from "@/shared/ui/icons";

import { compareShifts, countByStatus, summarize } from "../schedule";
import type { AgencyShift, NewShiftInput, ShiftStatus } from "../types";
import { PostShiftDialog } from "./post-shift-dialog";
import { ShiftsTable } from "./shifts-table";
import { StatCard } from "./stat-card";

type ShiftBoardProps = {
  agencyName: string;
  initialShifts: AgencyShift[];
};

type TabKey = "all" | ShiftStatus;

export function ShiftBoard({ agencyName, initialShifts }: ShiftBoardProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [postOpen, setPostOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const postButtonRef = useRef<HTMLButtonElement>(null);

  const summary = summarize(shifts);
  const hasCancelled = countByStatus(shifts, "cancelled") > 0;
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All shifts", count: shifts.length },
    { key: "open", label: "Open", count: summary.open },
    { key: "filled", label: "Filled", count: summary.filled },
    ...(hasCancelled
      ? [{ key: "cancelled" as const, label: "Cancelled", count: countByStatus(shifts, "cancelled") }]
      : []),
  ];
  const activeTab = tabs.some((item) => item.key === tab) ? tab : "all";
  const visible = shifts.filter((shift) => activeTab === "all" || shift.status === activeTab);

  function postShift(input: NewShiftInput) {
    const next = shifts.length + 1;
    setShifts((current) =>
      [...current, { ...input, id: `new-${next}`, status: "open" as const, nurseName: null }].sort(
        compareShifts,
      ),
    );
    setTab("all");
    setNotice("Shift posted");
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const target = tabs[(index + step + tabs.length) % tabs.length];
    if (!target) return;
    setTab(target.key);
    document.getElementById(`tab-${target.key}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
          Workspace <span aria-hidden="true">/</span> <span aria-current="page">Overview</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="font-display text-[2.25rem] leading-[1.12] text-brand-800 md:text-5xl">
              Staffing, at a glance.
            </h1>
            <p className="mt-2 text-lg text-text-muted">
              Keep your shifts covered and your team ready.
            </p>
          </div>
          <button
            ref={postButtonRef}
            type="button"
            data-testid="agency-post-shift-button"
            onClick={() => setPostOpen(true)}
            className="h-11 rounded-control bg-brand-800 px-5 font-medium text-on-brand hover:bg-brand-900"
          >
            Post a shift
          </button>
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          data-testid="notification-banner"
          className="flex items-center justify-between gap-4 rounded-control bg-success-bg px-4 py-3 text-sm font-medium text-success-text"
        >
          {notice}
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="h-11 rounded-control px-3 hover:bg-success-text/10"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open shifts" value={String(summary.open)} />
        <StatCard label="Filled shifts" value={String(summary.filled)} />
        {summary.coveragePercent === null ? (
          <StatCard label="Coverage" value="—" note="No shifts in this period" />
        ) : (
          <StatCard label="Coverage" value={`${summary.coveragePercent}%`}>
            <div
              role="meter"
              aria-label="Coverage"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.coveragePercent}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
            >
              <div
                className="h-full rounded-full bg-brand-800"
                style={{ width: `${summary.coveragePercent}%` }}
              />
            </div>
          </StatCard>
        )}
        <StatCard label="Hours scheduled" value={`${summary.scheduledHours}h`} />
      </section>

      <section
        aria-labelledby="upcoming-title"
        className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
      >
        <div className="px-5 pt-6 sm:px-6">
          <h2 id="upcoming-title" className="font-display text-2xl leading-tight">
            Upcoming shifts
          </h2>
          <p className="mt-1 text-text-muted">Your agency&apos;s schedule for the week</p>
        </div>

        <div role="tablist" aria-label="Shift status" className="mt-4 flex gap-6 overflow-x-auto border-b border-border px-5 sm:px-6">
          {tabs.map((item, index) => {
            const selected = item.key === activeTab;
            return (
              <button
                key={item.key}
                id={`tab-${item.key}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls="shift-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(item.key)}
                onKeyDown={(event) => moveTab(event, index)}
                className={`-mb-px h-12 shrink-0 border-b-2 text-sm font-medium ${
                  selected
                    ? "border-brand-800 text-brand-800"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {item.label} ({item.count})
              </button>
            );
          })}
        </div>

        <div id="shift-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          <ShiftsTable
            shifts={visible}
            agencyName={agencyName}
            emptyMessage={shifts.length === 0 ? "No shifts in this period." : "No shifts match these filters."}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 text-sm text-text-muted sm:px-6">
          <p>
            Showing {visible.length} {visible.length === 1 ? "shift" : "shifts"}
          </p>
          <p>Facility-local time</p>
        </div>
      </section>

      <aside className="flex items-center gap-4 rounded-card bg-sage px-5 py-4 sm:px-6">
        <ShieldCheckIcon className="size-8 shrink-0 text-brand-800" />
        <div>
          <p className="font-display text-lg leading-snug text-brand-800">
            Credential checks happen before a shift is claimed.
          </p>
          <p className="text-sm text-text-muted">
            Nurses with expired required credentials cannot claim shifts.
          </p>
        </div>
      </aside>

      <PostShiftDialog
        open={postOpen}
        agencyName={agencyName}
        onClose={() => {
          setPostOpen(false);
          postButtonRef.current?.focus();
        }}
        onPost={postShift}
      />
    </div>
  );
}

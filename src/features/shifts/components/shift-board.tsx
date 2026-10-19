"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { apiFetch } from "@/shared/client/api-client";
import { ShieldCheckIcon } from "@/shared/ui/icons";

import { formatDate, summarize } from "@/contracts/shifts/schedule";
import type { NewShiftInput } from "@/contracts/shifts/schemas";
import { useServerRefresh } from "@/shared/client/use-server-refresh";
import type { AgencyShift, CancellationReason, ShiftDTO } from "@/contracts/shifts/types";
import { PostShiftDialog } from "./post-shift-dialog";
import { ReopenShiftDialog, type ReopenTarget } from "./reopen-shift-dialog";
import { ShiftsTable } from "./shifts-table";
import { StatusTabs, type StatusTab, type TabKey } from "./status-tabs";
import { SummaryCards } from "./summary-cards";

type ShiftBoardProps = {
  agencyName: string;
  shifts: AgencyShift[];
};

export function ShiftBoard({ agencyName, shifts }: ShiftBoardProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const awaitedShift = useRef<{ id: string; resolve: () => void } | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReopenTarget | null>(null);
  const { refresh } = useServerRefresh();
  const postButtonRef = useRef<HTMLButtonElement>(null);

  const summary = summarize(shifts);
  const tabs: StatusTab[] = [
    { key: "all", label: "All shifts", count: shifts.length },
    { key: "open", label: "Open", count: summary.open },
    { key: "filled", label: "Filled", count: summary.filled },
  ];
  const activeTab = tabs.some((item) => item.key === tab) ? tab : "all";
  const visible = shifts.filter((shift) => activeTab === "all" || shift.status === activeTab);

  useEffect(() => {
    const awaited = awaitedShift.current;
    if (!awaited) return;
    if (shifts.some((shift) => shift.id === awaited.id) || !refreshing) {
      awaitedShift.current = null;
      awaited.resolve();
    }
  }, [shifts, refreshing]);

  async function postShift(input: NewShiftInput) {
    const created = await apiFetch<ShiftDTO>("/api/shifts", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await new Promise<void>((resolve) => {
      awaitedShift.current = { id: created.id, resolve };
      startRefresh(() => router.refresh());
    });
    setTab("all");
    setNotice("Shift posted");
  }

  async function cancelAssignment(shift: ReopenTarget, reason: CancellationReason) {
    setNotice(null);
    try {
      await apiFetch<ShiftDTO>(`/api/shifts/${shift.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    } catch (failure) {
      await refresh();
      throw failure;
    }
    await refresh();
    const prefix = reason === "no-show" ? "No-show reported" : "Assignment cancelled";
    setNotice(
      `${prefix}: ${shift.nurseName ?? "The nurse"} was unassigned from the ${shift.role} shift on ${formatDate(shift.date)}. The shift is open again.`,
    );
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
            onClick={() => {
              setNotice(null);
              setPostOpen(true);
            }}
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

      <SummaryCards summary={summary} emptyNote="No shifts posted yet." />

      <section
        aria-labelledby="shifts-title"
        className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
      >
        <div className="px-5 pt-6 sm:px-6">
          <h2 id="shifts-title" className="font-display text-2xl leading-tight">
            Your shifts
          </h2>
          <p className="mt-1 text-text-muted">Every shift your agency has posted</p>
        </div>

        <StatusTabs tabs={tabs} active={activeTab} onSelect={setTab} />

        <div id="shift-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          <ShiftsTable
            shifts={visible}
            agencyName={agencyName}
            emptyMessage={shifts.length === 0 ? "No shifts posted yet." : "No shifts match these filters."}
            onCancel={(shift) => {
              setNotice(null);
              setCancelTarget({ ...shift, agencyName });
            }}
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

      <ReopenShiftDialog
        mode="agency"
        shift={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancelAssignment}
      />
    </div>
  );
}

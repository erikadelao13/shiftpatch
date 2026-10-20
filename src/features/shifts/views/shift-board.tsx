"use client";

import { plural } from "@/shared/lib/text";
import { ShieldCheckIcon } from "@/shared/ui/icons";

import { PostShiftDialog } from "../components/post-shift-dialog";
import { ReopenShiftDialog } from "../components/reopen-shift-dialog";
import { ShiftsTable } from "../components/shifts-table";
import { StatusTabs } from "../components/status-tabs";
import { SummaryCards } from "../components/summary-cards";
import { useShiftBoard } from "../hooks/use-shift-board";

type ShiftBoardProps = {
  userId: string;
  agencyName: string;
};

export function ShiftBoard({ userId, agencyName }: ShiftBoardProps) {
  const {
    shifts,
    summary,
    tab,
    setTab,
    tabs,
    visible,
    notice,
    dismissNotice,
    postOpen,
    postButtonRef,
    openPostDialog,
    closePostDialog,
    postShift,
    cancelTarget,
    startCancel,
    closeCancelDialog,
    cancelAssignment,
  } = useShiftBoard(userId, agencyName);

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
            onClick={openPostDialog}
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
            onClick={dismissNotice}
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

        <StatusTabs tabs={tabs} active={tab} onSelect={setTab} />

        <div id="shift-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          <ShiftsTable
            shifts={visible}
            agencyName={agencyName}
            emptyMessage={shifts.length === 0 ? "No shifts posted yet." : "No shifts match these filters."}
            onCancel={startCancel}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 text-sm text-text-muted sm:px-6">
          <p>
            Showing {plural(visible.length, "shift")}
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
        onClose={closePostDialog}
        onPost={postShift}
      />

      <ReopenShiftDialog
        mode="agency"
        shift={cancelTarget}
        onClose={closeCancelDialog}
        onConfirm={cancelAssignment}
      />
    </div>
  );
}

"use client";

import { plural } from "@/shared/lib/text";
import { RefreshIcon, ShieldCheckIcon } from "@/shared/ui/icons";
import { RefreshError } from "@/shared/ui/refresh-error";

import { AdminShiftsTable } from "../components/admin-shifts-table";
import { FilterSelect } from "../components/filter-select";
import { StatusTabs } from "../components/status-tabs";
import { SummaryCards } from "../components/summary-cards";
import { useAdminShiftOverview } from "../hooks/use-admin-shift-overview";

export function AdminShiftOverview({ userId }: { userId: string }) {
  const {
    refreshing,
    refresh,
    refreshError,
    announcement,
    agencies,
    shifts,
    activeAgency,
    setAgencyId,
    summary,
    tab,
    setTab,
    tabs,
    visible,
    filtering,
    clearFilters,
  } = useAdminShiftOverview(userId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
          Workspace <span aria-hidden="true">/</span>{" "}
          <span aria-current="page">Administration</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="font-display text-[2.25rem] leading-[1.12] text-brand-800 md:text-5xl">
              Every shift, in view.
            </h1>
            <p className="mt-2 text-lg text-text-muted">
              Track coverage and assignments across both agencies.
            </p>
          </div>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refresh()}
            className="flex h-11 items-center gap-2 rounded-control border border-input-border bg-surface px-4 font-medium hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <RefreshError error={refreshError} />

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <SummaryCards summary={summary} emptyNote="No shifts posted yet." />

      <section
        aria-labelledby="overview-title"
        className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-6 sm:px-6">
          <div>
            <h2 id="overview-title" className="font-display text-2xl leading-tight">
              Shift overview
            </h2>
            <p className="mt-1 text-text-muted">All agencies, one clear view.</p>
          </div>
          <FilterSelect
            label="Agency"
            allLabel="All agencies"
            value={activeAgency}
            options={agencies.map((agency) => ({ value: agency.id, label: agency.name }))}
            onChange={setAgencyId}
          />
        </div>

        <StatusTabs tabs={tabs} active={tab} onSelect={setTab} />

        <div id="shift-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center sm:px-6">
              <p className="text-text-muted">
                {shifts.length === 0 ? "No shifts posted yet." : "No shifts match these filters."}
              </p>
              {filtering ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-11 rounded-control border border-brand-800 bg-surface px-4 font-medium text-brand-800 hover:bg-surface-subtle"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <AdminShiftsTable shifts={visible} />
          )}
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
            Clear status. Accurate coverage.
          </p>
          <p className="text-sm text-text-muted">
            Cancelling an assignment reopens the shift and removes the assigned nurse.
          </p>
        </div>
      </aside>
    </div>
  );
}

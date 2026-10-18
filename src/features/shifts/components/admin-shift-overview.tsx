"use client";

import { useEffect, useRef, useState } from "react";

import { RefreshIcon, ShieldCheckIcon } from "@/shared/ui/icons";

import { summarize } from "../schedule";
import { useServerRefresh } from "../use-server-refresh";
import type { AdminShift, AgencyOption } from "../types";
import { AdminShiftsTable } from "./admin-shifts-table";
import { ALL, FilterSelect } from "./filter-select";
import { StatusTabs, type StatusTab, type TabKey } from "./status-tabs";
import { SummaryCards } from "./summary-cards";

type AdminShiftOverviewProps = {
  agencies: AgencyOption[];
  shifts: AdminShift[];
};

export function AdminShiftOverview({ agencies, shifts }: AdminShiftOverviewProps) {
  const { refresh, refreshing } = useServerRefresh();
  const [agencyId, setAgencyId] = useState(ALL);
  const [tab, setTab] = useState<TabKey>("all");
  const [announcement, setAnnouncement] = useState("");
  const refreshingRef = useRef(refreshing);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    function refreshOnReturn() {
      if (document.visibilityState === "visible" && !refreshingRef.current) void refresh();
    }
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => document.removeEventListener("visibilitychange", refreshOnReturn);
  }, [refresh]);

  async function refreshFromButton() {
    setAnnouncement("");
    await refresh();
    setAnnouncement("Shift overview refreshed.");
  }

  const activeAgency = agencies.some((agency) => agency.id === agencyId) ? agencyId : ALL;
  const inAgency = shifts.filter((shift) => activeAgency === ALL || shift.agencyId === activeAgency);
  const summary = summarize(inAgency);
  const tabs: StatusTab[] = [
    { key: "all", label: "All shifts", count: inAgency.length },
    { key: "open", label: "Open", count: summary.open },
    { key: "filled", label: "Filled", count: summary.filled },
  ];
  const visible = inAgency.filter((shift) => tab === "all" || shift.status === tab);
  const filtering = activeAgency !== ALL || tab !== "all";

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
                  onClick={() => {
                    setAgencyId(ALL);
                    setTab("all");
                  }}
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
            Showing {visible.length} {visible.length === 1 ? "shift" : "shifts"}
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

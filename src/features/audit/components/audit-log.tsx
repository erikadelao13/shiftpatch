"use client";

import { useEffect, useRef, useState } from "react";

import { useServerRefresh } from "@/features/shifts/use-server-refresh";
import { ClockIcon, LockIcon, RefreshIcon } from "@/shared/ui/icons";

import type { AuditEntry } from "../types";
import { AuditLogTable } from "./audit-log-table";

function eventCount(count: number): string {
  return `${count} ${count === 1 ? "event" : "events"}`;
}

export function AuditLog({ entries, total }: { entries: AuditEntry[]; total: number }) {
  const { refresh, refreshing } = useServerRefresh();
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
    setAnnouncement("Audit log refreshed.");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
          Workspace <span aria-hidden="true">/</span>{" "}
          <span aria-current="page">Audit log</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="font-display text-[2.25rem] leading-[1.12] text-brand-800 md:text-5xl">
              A clear record of every change.
            </h1>
            <p className="mt-2 text-lg text-text-muted">
              Review actions across both agencies and nurse accounts.
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

      <section
        aria-labelledby="audit-log-title"
        className="rounded-card border border-border bg-surface shadow-card"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-5 pt-6 pb-5 sm:px-6">
          <div>
            <h2 id="audit-log-title" className="font-display text-2xl leading-tight">
              Audit log
            </h2>
            <p className="mt-1 text-text-muted">Successful actions, recorded as they happen.</p>
          </div>
          <p className="text-sm text-text-muted">{eventCount(total)}</p>
        </div>

        <div className="mx-5 border-t border-border sm:mx-6">
          {entries.length === 0 ? (
            <p className="py-10 text-center text-text-muted">No events recorded yet.</p>
          ) : (
            <AuditLogTable entries={entries} />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-4 text-sm text-text-muted">
            <p>
              {total > entries.length
                ? `Showing ${entries.length} of ${total} events`
                : `Showing ${eventCount(entries.length)}`}
            </p>
            <p className="flex items-center gap-2">
              <ClockIcon />
              Times in UTC
            </p>
          </div>
        </div>
      </section>

      <aside className="flex items-center gap-4 rounded-card border border-border bg-sage px-5 py-4 sm:px-6">
        <LockIcon className="size-8 shrink-0 text-brand-800" />
        <div>
          <p className="font-medium text-brand-800">Read-only history</p>
          <p className="text-sm text-text-muted">
            Events are recorded automatically when an action succeeds.
          </p>
        </div>
      </aside>
    </div>
  );
}

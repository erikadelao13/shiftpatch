"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";
import { ShieldCheckIcon } from "@/shared/ui/icons";

import { formatDate } from "@/shared/lib/dates";
import { SHIFT_ROLES, type MarketplaceShift, type ShiftDTO } from "@/contracts/shifts/types";
import { ALL, FilterSelect } from "../components/filter-select";
import { MyShiftsTable } from "../components/my-shifts-table";
import { OpenShiftsTable } from "../components/open-shifts-table";
import { ReopenShiftDialog, type ReopenTarget } from "../components/reopen-shift-dialog";
import { marketplaceQuery } from "../queries/marketplace-query";

type MarketplaceProps = {
  userId: string;
  banner: ReactNode;
};

type Notice = { kind: "success" | "error"; message: string };

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function Marketplace({ userId, banner }: MarketplaceProps) {
  const queryClient = useQueryClient();
  const {
    data: { openShifts, myShifts },
    isFetching,
  } = useSuspenseQuery(marketplaceQuery(userId));
  const [agency, setAgency] = useState(ALL);
  const [role, setRole] = useState(ALL);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReopenTarget | null>(null);

  const agencies = [...new Set(openShifts.map((shift) => shift.agencyName))].sort();
  const filtered = openShifts.filter(
    (shift) =>
      (agency === ALL || shift.agencyName === agency) && (role === ALL || shift.role === role),
  );
  const filtering = agency !== ALL || role !== ALL;

  const claimMutation = useMutation({
    mutationFn: (shift: MarketplaceShift) =>
      apiFetch<ShiftDTO>(`/api/shifts/${shift.id}/claim`, { method: "POST" }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.marketplace(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timesheets(userId) });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (shift: ReopenTarget) =>
      apiFetch<ShiftDTO>(`/api/shifts/${shift.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "advance" }),
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timesheets(userId) }),
      ]),
  });

  const claimingId = claimMutation.isPending ? claimMutation.variables.id : null;

  async function claim(shift: MarketplaceShift) {
    setNotice(null);
    try {
      await claimMutation.mutateAsync(shift);
      setNotice({
        kind: "success",
        message: `Shift claimed: ${shift.role} on ${formatDate(shift.date)} with ${shift.agencyName}`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not claim this shift.",
      });
    }
  }

  async function cancelAssignment(shift: ReopenTarget) {
    setNotice(null);
    await cancelMutation.mutateAsync(shift);
    setNotice({
      kind: "success",
      message: `Assignment cancelled: ${shift.role} on ${formatDate(shift.date)} with ${shift.agencyName}. The shift is open again.`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
          Workspace <span aria-hidden="true">/</span>{" "}
          <span aria-current="page">Shift marketplace</span>
        </nav>
        <div>
          <h1 className="font-display text-[2.25rem] leading-[1.12] text-brand-800 md:text-5xl">
            Find your next shift.
          </h1>
          <p className="mt-2 text-lg text-text-muted">
            Browse openings and keep track of your assignments.
          </p>
        </div>
      </header>

      {banner}

      {notice ? (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          data-testid="notification-banner"
          className={`flex items-center justify-between gap-4 rounded-control px-4 py-3 text-sm font-medium ${
            notice.kind === "error"
              ? "bg-danger-bg text-danger-text"
              : "bg-success-bg text-success-text"
          }`}
        >
          {notice.message}
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="h-11 shrink-0 rounded-control px-3 hover:bg-black/5"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section
        aria-labelledby="available-title"
        className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-6 sm:px-6">
          <div>
            <h2 id="available-title" className="font-display text-2xl leading-tight">
              Available shifts
            </h2>
            <p className="mt-1 text-text-muted">Open shifts across both agencies</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap gap-3">
              <FilterSelect
                label="Agency"
                allLabel="All agencies"
                value={agency}
                options={agencies.map((name) => ({ value: name, label: name }))}
                onChange={setAgency}
              />
              <FilterSelect
                label="Role"
                allLabel="All roles"
                value={role}
                options={SHIFT_ROLES.map((name) => ({ value: name, label: name }))}
                onChange={setRole}
              />
            </div>
            <p className="text-sm text-text-muted" aria-live="polite">
              {plural(filtered.length, "open shift")}
            </p>
          </div>
        </div>

        <div className="mt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center sm:px-6">
              <p className="text-text-muted">
                {filtering ? "No shifts match these filters." : "No open shifts right now."}
              </p>
              {filtering ? (
                <button
                  type="button"
                  onClick={() => {
                    setAgency(ALL);
                    setRole(ALL);
                  }}
                  className="h-11 rounded-control border border-brand-800 bg-surface px-4 font-medium text-brand-800 hover:bg-surface-subtle"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <OpenShiftsTable
              shifts={filtered}
              claimingId={claimingId}
              busy={claimMutation.isPending || isFetching}
              onClaim={claim}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 text-sm text-text-muted sm:px-6">
          <p>Showing {plural(filtered.length, "open shift")}</p>
          <p>Facility-local time</p>
        </div>
      </section>

      <section
        id="my-shifts"
        aria-labelledby="my-shifts-title"
        className="scroll-mt-8 overflow-hidden rounded-card border border-border bg-surface shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-2 px-5 pt-6 sm:px-6">
          <div>
            <h2 id="my-shifts-title" className="font-display text-2xl leading-tight">
              My shifts
            </h2>
            <p className="mt-1 text-text-muted">Shifts assigned to you</p>
          </div>
          <p className="text-sm text-text-muted">{plural(myShifts.length, "shift")}</p>
        </div>

        <div className="mt-4">
          {myShifts.length === 0 ? (
            <p className="px-5 py-10 text-center text-text-muted sm:px-6">
              You have no assigned shifts yet.
            </p>
          ) : (
            <MyShiftsTable
              shifts={myShifts}
              onCancel={(shift) => {
                setNotice(null);
                setCancelTarget({ ...shift, nurseName: null });
              }}
            />
          )}
        </div>

        <div className="border-t border-border px-5 py-4 text-sm text-text-muted sm:px-6">
          <p>{plural(myShifts.length, "assigned shift")}</p>
        </div>
      </section>

      <aside className="flex items-center gap-4 px-1 text-text-muted">
        <ShieldCheckIcon className="size-7 shrink-0" />
        <div>
          <p className="text-sm font-medium text-text">
            Credential checks happen before a shift is claimed.
          </p>
          <p className="text-sm">Nurses with expired credentials cannot claim shifts.</p>
        </div>
      </aside>

      <ReopenShiftDialog
        mode="nurse"
        shift={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancelAssignment}
      />
    </div>
  );
}

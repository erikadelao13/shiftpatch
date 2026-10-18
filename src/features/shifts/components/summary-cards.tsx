import type { ShiftSummary } from "../schedule";
import { StatCard } from "./stat-card";

type SummaryCardsProps = {
  summary: ShiftSummary;
  emptyNote: string;
};

export function SummaryCards({ summary, emptyNote }: SummaryCardsProps) {
  return (
    <section aria-label="Summary" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Open shifts" value={String(summary.open)} />
      <StatCard label="Filled shifts" value={String(summary.filled)} />
      {summary.coveragePercent === null ? (
        <StatCard label="Coverage" value="—" note={emptyNote} />
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
  );
}

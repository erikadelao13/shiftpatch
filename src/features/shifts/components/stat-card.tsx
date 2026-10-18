import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  note?: string;
  children?: ReactNode;
};

export function StatCard({ label, value, note, children }: StatCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <p className="text-base text-text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl leading-[1.1] tabular-nums">{value}</p>
      {children}
      {note ? <p className="mt-2 text-sm text-text-muted">{note}</p> : null}
    </div>
  );
}

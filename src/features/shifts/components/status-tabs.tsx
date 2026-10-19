import type { KeyboardEvent } from "react";

import type { ShiftStatus } from "@/contracts/shifts/types";

export type TabKey = "all" | ShiftStatus;

export type StatusTab = { key: TabKey; label: string; count: number };

type StatusTabsProps = {
  tabs: readonly StatusTab[];
  active: TabKey;
  onSelect: (key: TabKey) => void;
};

export function StatusTabs({ tabs, active, onSelect }: StatusTabsProps) {
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const target = tabs[(index + step + tabs.length) % tabs.length];
    if (!target) return;
    onSelect(target.key);
    document.getElementById(`tab-${target.key}`)?.focus();
  }

  return (
    <div role="tablist" aria-label="Shift status" className="mt-4 flex gap-6 overflow-x-auto border-b border-border px-5 sm:px-6">
      {tabs.map((item, index) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            id={`tab-${item.key}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls="shift-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(item.key)}
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
  );
}

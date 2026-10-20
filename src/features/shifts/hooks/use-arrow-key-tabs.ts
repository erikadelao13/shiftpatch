import type { KeyboardEvent } from "react";

import type { StatusTab, TabKey } from "../lib/filters";

export function useArrowKeyTabs(tabs: readonly StatusTab[], onSelect: (key: TabKey) => void) {
  return function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const target = tabs[(index + step + tabs.length) % tabs.length];
    if (!target) return;
    onSelect(target.key);
    document.getElementById(`tab-${target.key}`)?.focus();
  };
}

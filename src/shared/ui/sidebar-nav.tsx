"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type SidebarNavItem = { href: string; label: string; icon: ReactNode };

export function SidebarNav({ label, items }: { label: string; items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const current = item.href === pathname;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-control px-3 text-base font-medium ${
                  current ? "bg-sage text-brand-800" : "hover:bg-on-brand/10"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { signOut } from "@/features/auth/actions";
import { requireRole } from "@/features/auth/server/current-user";
import { CalendarIcon, GridIcon } from "@/shared/ui/icons";
import { Sidebar } from "@/shared/ui/sidebar";

export default function NurseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <Suspense fallback={<div className="min-h-20 bg-brand-800 lg:w-60" aria-hidden="true" />}>
        <NurseSidebar />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

async function NurseSidebar() {
  const user = await requireRole("nurse");

  return (
    <Sidebar
      workspaceName="Nurse workspace"
      userName={user.name}
      roleLabel="Nurse"
      signOutAction={signOut}
      nav={
        <nav aria-label="Nurse">
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/nurse"
                aria-current="page"
                className="flex h-11 items-center gap-3 rounded-control bg-sage px-3 text-base font-medium text-brand-800"
              >
                <GridIcon />
                Shift marketplace
              </Link>
            </li>
            <li>
              <Link
                href="/nurse#my-shifts"
                className="flex h-11 items-center gap-3 rounded-control px-3 text-base font-medium hover:bg-on-brand/10"
              >
                <CalendarIcon />
                My shifts
              </Link>
            </li>
          </ul>
        </nav>
      }
    />
  );
}

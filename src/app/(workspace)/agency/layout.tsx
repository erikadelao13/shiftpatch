import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { signOut } from "@/features/auth/actions";
import { requireRole } from "@/features/auth/server/current-user";
import { getPrisma } from "@/shared/server/db";
import { HomeIcon } from "@/shared/ui/icons";
import { Sidebar } from "@/shared/ui/sidebar";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <Suspense fallback={<div className="min-h-20 bg-brand-800 lg:w-60" aria-hidden="true" />}>
        <AgencySidebar />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

async function AgencySidebar() {
  const user = await requireRole("agency");
  const agency = user.agencyId
    ? await getPrisma().agency.findUnique({
        where: { id: user.agencyId },
        select: { name: true },
      })
    : null;

  return (
    <Sidebar
      workspaceName={agency?.name ?? user.name}
      userName={user.name}
      roleLabel="Agency"
      signOutAction={signOut}
      nav={
        <nav aria-label="Agency">
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/agency"
                aria-current="page"
                className="flex h-11 items-center gap-3 rounded-control bg-sage px-3 text-base font-medium text-brand-800"
              >
                <HomeIcon />
                Overview
              </Link>
            </li>
          </ul>
        </nav>
      }
    />
  );
}

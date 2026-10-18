import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { signOut } from "@/features/auth/actions";
import { requireRole } from "@/features/auth/server/current-user";
import { GridIcon } from "@/shared/ui/icons";
import { Sidebar } from "@/shared/ui/sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <Suspense fallback={<div className="min-h-20 bg-brand-800 lg:w-60" aria-hidden="true" />}>
        <AdminSidebar />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

async function AdminSidebar() {
  const user = await requireRole("admin");

  return (
    <Sidebar
      workspaceName="Administration"
      userName={user.name}
      roleLabel="Administrator"
      signOutAction={signOut}
      nav={
        <nav aria-label="Administration">
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/admin"
                aria-current="page"
                className="flex h-11 items-center gap-3 rounded-control bg-sage px-3 text-base font-medium text-brand-800"
              >
                <GridIcon />
                Shift overview
              </Link>
            </li>
          </ul>
        </nav>
      }
    />
  );
}

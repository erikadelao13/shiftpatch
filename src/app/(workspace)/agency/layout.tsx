import { Suspense, type ReactNode } from "react";

import { signOut } from "@/actions/auth";
import { requireRole } from "@/server/auth/current-user";
import { getAgencyName } from "@/server/shifts/shift-service";
import { HomeIcon, NoteIcon } from "@/shared/ui/icons";
import { Sidebar } from "@/shared/ui/sidebar";
import { SidebarNav } from "@/shared/ui/sidebar-nav";

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
  const agencyName = user.agencyId ? await getAgencyName(user.agencyId) : user.name;

  return (
    <Sidebar
      workspaceName={agencyName}
      userName={user.name}
      roleLabel="Agency"
      signOutAction={signOut}
      nav={
        <SidebarNav
          label="Agency"
          items={[
            { href: "/agency", label: "Overview", icon: <HomeIcon /> },
            { href: "/agency/timesheets", label: "Timesheets", icon: <NoteIcon /> },
          ]}
        />
      }
    />
  );
}

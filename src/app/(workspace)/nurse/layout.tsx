import { Suspense, type ReactNode } from "react";

import { signOut } from "@/actions/auth";
import { requireRole } from "@/server/auth/current-user";
import { CalendarIcon, DocumentIcon, GridIcon, NoteIcon } from "@/shared/ui/icons";
import { Sidebar } from "@/shared/ui/sidebar";
import { SidebarNav } from "@/shared/ui/sidebar-nav";

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
        <SidebarNav
          label="Nurse"
          items={[
            { href: "/nurse", label: "Shift marketplace", icon: <GridIcon /> },
            { href: "/nurse#my-shifts", label: "My shifts", icon: <CalendarIcon /> },
            { href: "/nurse/credentials", label: "Credentials", icon: <DocumentIcon /> },
            { href: "/nurse/timesheets", label: "Timesheets", icon: <NoteIcon /> },
          ]}
        />
      }
    />
  );
}

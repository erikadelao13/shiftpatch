import { Suspense, type ReactNode } from "react";

import { signOut } from "@/features/auth/actions";
import { requireRole } from "@/features/auth/server/current-user";
import { DocumentIcon, GridIcon } from "@/shared/ui/icons";
import { Sidebar } from "@/shared/ui/sidebar";
import { SidebarNav } from "@/shared/ui/sidebar-nav";

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
        <SidebarNav
          label="Administration"
          items={[
            { href: "/admin", label: "Shift overview", icon: <GridIcon /> },
            { href: "/admin/audit", label: "Audit log", icon: <DocumentIcon /> },
          ]}
        />
      }
    />
  );
}

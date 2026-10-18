import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AdminWorkspace />
    </Suspense>
  );
}

async function AdminWorkspace() {
  const user = await requireRole("admin");

  return (
    <section className="flex flex-col gap-3">
      <h1 className="font-display text-4xl leading-[1.12] text-brand-800">
        Welcome, {user.name}
      </h1>
      <h2 className="text-lg font-medium">Coverage reporting will live here</h2>
      <p className="max-w-xl text-text-muted">
        The shift table, audit log and timesheets arrive in upcoming releases.
      </p>
    </section>
  );
}

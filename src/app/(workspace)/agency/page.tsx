import { Suspense } from "react";

import { requireRole } from "@/features/auth/server/current-user";

export default function AgencyPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading…</p>}>
      <AgencyWorkspace />
    </Suspense>
  );
}

async function AgencyWorkspace() {
  const user = await requireRole("agency");

  return (
    <section className="flex flex-col gap-3">
      <h1 className="font-display text-4xl leading-[1.12] text-brand-800">
        Welcome, {user.name}
      </h1>
      <h2 className="text-lg font-medium">Your agency&apos;s shifts will live here</h2>
      <p className="max-w-xl text-text-muted">
        Posting shifts and tracking coverage arrive in an upcoming release.
      </p>
    </section>
  );
}

import { Suspense, type ReactNode } from "react";

import { signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/server/current-user";
import { getPrisma } from "@/shared/server/db";
import { Logo } from "@/shared/ui/logo";

const ROLE_LABELS = {
  nurse: "Nurse",
  agency: "Agency",
  admin: "Administrator",
} as const;

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo tone="on-light" />
          {/* The session read streams in behind a boundary (cacheComponents). */}
          <Suspense fallback={<div className="h-10 w-56" aria-hidden="true" />}>
            <SignedInUser />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

async function SignedInUser() {
  const user = await getCurrentUser();
  const agency = user.agencyId
    ? await getPrisma().agency.findUnique({
        where: { id: user.agencyId },
        select: { name: true },
      })
    : null;

  return (
    <div className="flex items-center gap-4">
      <div className="text-left leading-tight sm:text-right" data-testid="signed-in-user">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="text-sm text-text-muted">
          {ROLE_LABELS[user.role]}
          {/* An agency login is named after its agency; don't repeat it. */}
          {agency && agency.name !== user.name ? ` · ${agency.name}` : ""}
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          data-testid="sign-out-button"
          className="h-11 rounded-control border border-input-border bg-surface px-4 text-sm font-medium hover:bg-surface-subtle"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

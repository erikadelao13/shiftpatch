import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/views/login-form";
import {
  getOptionalUser,
  workspacePathFor,
} from "@/server/auth/current-user";
import { Logo } from "@/shared/ui/logo";

export const metadata: Metadata = {
  title: "Sign in · ShiftPatch",
};

// Checks the database, not just the cookie signature, so a revoked session
// stays on the form instead of looping.
async function RedirectIfSignedIn() {
  const user = await getOptionalUser();
  if (user) redirect(workspacePathFor(user.role));
  return null;
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[46fr_54fr]">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <aside className="relative flex flex-col gap-10 overflow-hidden bg-brand-800 px-6 py-8 text-on-brand sm:px-10 lg:px-16 lg:py-16">
        <Logo tone="on-brand" />

        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold">
            Healthcare staffing
          </p>
          <p className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-[64px]">
            Better coverage. Better care.
          </p>
          <p className="max-w-md text-base leading-relaxed text-on-brand/80">
            Connect the right nurses with the shifts that need them.
          </p>
        </div>

        {/* Decorative only: must not read as live staffing data. */}
        <div
          aria-hidden="true"
          className="hidden flex-col items-start gap-0 lg:flex"
        >
          <div className="w-72 rounded-card border border-on-brand/15 bg-on-brand/5 p-5">
            <div className="mb-4 h-2.5 w-24 rounded-full bg-gold/70" />
            <div className="mb-2 h-2 w-full rounded-full bg-on-brand/25" />
            <div className="h-2 w-2/3 rounded-full bg-on-brand/25" />
          </div>
          <div className="ml-12 h-8 w-px bg-gold/70" />
          <div className="ml-16 flex w-64 items-center gap-4 rounded-card border border-on-brand/15 bg-on-brand/5 p-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/25 text-gold">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12 5 5 9-10" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-2 h-2 w-20 rounded-full bg-on-brand/25" />
              <div className="h-2 w-12 rounded-full bg-on-brand/25" />
            </div>
          </div>
        </div>

        <p className="mt-auto hidden text-sm text-on-brand/70 lg:block">
          A little less scrambling. A lot more care.
        </p>
        <svg
          aria-hidden="true"
          viewBox="0 0 400 120"
          fill="none"
          className="pointer-events-none absolute -bottom-10 -right-10 hidden w-96 text-gold/40 lg:block"
        >
          <path d="M0 110C80 20 220 0 400 60" stroke="currentColor" strokeWidth="1.5" />
          <path d="M40 120C120 40 250 28 400 90" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </aside>

      <main className="flex items-center justify-center bg-canvas px-6 py-12 sm:px-10">
        <div className="flex w-full max-w-[440px] flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
              Welcome to ShiftPatch
            </p>
            <h1 className="font-display text-4xl leading-[1.1] text-brand-800 sm:text-5xl">
              Welcome back
            </h1>
            <p className="text-base text-text-muted">
              Sign in to manage your next shift.
            </p>
          </div>

          <LoginForm />

          <p className="text-sm text-text-muted">
            Your workspace is based on your account role.
          </p>

          <div className="flex items-start gap-3 rounded-card bg-sage p-4">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-brand-800"
            >
              <path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <p className="text-sm font-medium text-brand-800">
              Built around trusted care
            </p>
          </div>

          <p className="text-sm text-text-muted">
            Need access? Contact your administrator
          </p>
        </div>
      </main>
    </div>
  );
}

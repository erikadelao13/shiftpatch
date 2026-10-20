import type { ReactNode } from "react";

import { initialsOf } from "@/shared/lib/text";

import { Logo } from "./logo";
import { SignOutIcon } from "./icons";
import { SignOutForm } from "./sign-out-form";

type SidebarProps = {
  workspaceName: string;
  userName: string;
  roleLabel: string;
  nav: ReactNode;
  signOutAction: () => Promise<void>;
};

export function Sidebar({
  workspaceName,
  userName,
  roleLabel,
  nav,
  signOutAction,
}: SidebarProps) {
  return (
    <aside className="flex flex-col gap-6 bg-brand-800 px-4 py-4 text-on-brand lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:gap-8 lg:px-5 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:flex-col lg:items-start lg:gap-8">
        <Logo tone="on-brand" />
        <div className="lg:w-full">
          <p className="text-xs text-on-brand/70">Workspace</p>
          <p className="text-base font-medium leading-snug">{workspaceName}</p>
        </div>
      </div>

      {nav}

      <div className="flex items-center gap-3 border-t border-on-brand/15 pt-4 lg:mt-auto">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-medium text-brand-800"
        >
          {initialsOf(userName)}
        </span>
        <div className="min-w-0 flex-1 leading-tight" data-testid="signed-in-user">
          <p className="text-sm font-medium leading-snug">{userName}</p>
          <p className="text-sm text-on-brand/70">{roleLabel}</p>
        </div>
        <SignOutForm action={signOutAction}>
          <button
            type="submit"
            data-testid="sign-out-button"
            aria-label="Sign out"
            title="Sign out"
            className="flex size-11 items-center justify-center rounded-control text-on-brand hover:bg-on-brand/10 focus-visible:outline-on-brand"
          >
            <SignOutIcon />
          </button>
        </SignOutForm>
      </div>
    </aside>
  );
}

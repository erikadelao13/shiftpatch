"use client";

import type { ReactNode } from "react";

import { useSignOut } from "@/shared/hooks/use-sign-out";

export function SignOutForm({
  action,
  children,
}: {
  action: () => Promise<void>;
  children: ReactNode;
}) {
  const signOut = useSignOut(action);

  return <form action={signOut}>{children}</form>;
}

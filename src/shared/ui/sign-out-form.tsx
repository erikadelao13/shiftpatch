"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function SignOutForm({
  action,
  children,
}: {
  action: () => Promise<void>;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  return (
    <form
      action={async () => {
        queryClient.clear();
        await action();
      }}
    >
      {children}
    </form>
  );
}

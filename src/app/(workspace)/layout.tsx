import type { ReactNode } from "react";

import { QueryProvider } from "@/shared/client/query-provider";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}

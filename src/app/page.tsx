import { Suspense } from "react";
import { redirect } from "next/navigation";

import {
  getCurrentUser,
  workspacePathFor,
} from "@/features/auth/server/current-user";

// The proxy normally redirects `/` first; this is the authoritative fallback.
export default function Home() {
  return (
    <Suspense fallback={null}>
      <GoToWorkspace />
    </Suspense>
  );
}

async function GoToWorkspace() {
  const user = await getCurrentUser();
  return redirect(workspacePathFor(user.role));
}

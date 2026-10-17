import { Suspense } from "react";
import { redirect } from "next/navigation";

import {
  getCurrentUser,
  workspacePathFor,
} from "@/features/auth/server/current-user";

// The proxy normally redirects `/` first. This is the authoritative fallback:
// a signed-in user goes to their workspace, anyone else to /login.
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

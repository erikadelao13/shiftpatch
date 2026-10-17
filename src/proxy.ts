import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/features/auth/constants";
import { verifyToken } from "@/features/auth/server/token";
import { WORKSPACE_PATHS, workspacePathFor } from "@/features/auth/workspace";

// Optimistic redirects only: the cookie's signature and expiry, never the
// database. Each page still does the authoritative check (getCurrentUser).
// `/login` is deliberately not handled, so a revoked session that still carries
// a valid signature can't cause a redirect loop.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifyToken(token) : null;

  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));

  if (pathname === "/") {
    return redirectTo(claims ? workspacePathFor(claims.role) : "/login");
  }

  const workspace = WORKSPACE_PATHS.find(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (workspace) {
    if (!claims) return redirectTo("/login");
    const own = workspacePathFor(claims.role);
    if (workspace !== own) return redirectTo(own);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};

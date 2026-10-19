import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/server/auth/constants";
import { verifyToken } from "@/server/auth/token";
import { WORKSPACE_PATHS, workspacePathFor } from "@/contracts/auth/workspace";

// Optimistic redirects from the cookie signature only. `/login` is deliberately
// not handled: a revoked session with a valid signature would loop.
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

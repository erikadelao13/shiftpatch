import type { Role } from "./types";

// Plain module: the proxy imports it, so it must not pull in server-only code.
export const WORKSPACE_PATHS = ["/nurse", "/agency", "/admin"] as const;

export function workspacePathFor(role: Role): (typeof WORKSPACE_PATHS)[number] {
  return `/${role}`;
}

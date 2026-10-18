import "server-only";

import { ZodError } from "zod";

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 429;

// An error whose message is safe to show the caller.
export class HttpError extends Error {
  constructor(
    readonly status: ErrorStatus,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const noStore = { "Cache-Control": "no-store" };

// Unexpected errors become a sanitized 500; the cause is logged, never returned.
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: noStore },
    );
  }
  if (error instanceof ZodError) {
    return Response.json(
      { error: error.issues[0]?.message ?? "Invalid request" },
      { status: 400, headers: noStore },
    );
  }
  console.error(
    "Unhandled API error:",
    error instanceof Error ? error.message : error,
  );
  return Response.json(
    { error: "Internal server error" },
    { status: 500, headers: noStore },
  );
}

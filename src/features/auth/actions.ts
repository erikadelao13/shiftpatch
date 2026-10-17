"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HttpError } from "@/shared/server/errors";

import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./constants";
import { loginSchema } from "./schemas";
import { authenticate } from "./server/login";
import { revokeSession } from "./server/sessions";
import { verifyToken } from "./server/token";
import { workspacePathFor } from "./workspace";

export type SignInState = {
  email: string;
  error?: string;
};

// The browser signs in here rather than through POST /api/auth/login, so the
// token goes straight into an HttpOnly cookie and never reaches client JS.
export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";

  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { email, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  let result;
  try {
    result = await authenticate(parsed.data);
  } catch (error) {
    if (error instanceof HttpError) return { email, error: error.message };
    console.error(
      "Sign-in failed:",
      error instanceof Error ? error.message : error,
    );
    return { email, error: "Something went wrong. Please try again." };
  }

  (await cookies()).set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(workspacePathFor(result.user.role));
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifyToken(token) : null;
  if (claims) await revokeSession(claims.sessionId);

  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

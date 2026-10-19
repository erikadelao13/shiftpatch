import "server-only";

import { getPrisma } from "@/server/db";
import { HttpError } from "@/server/errors";

import {
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_FAILURE_LIMIT,
  LOGIN_FAILURE_WINDOW_MS,
} from "./constants";
import type { LoginInput } from "@/contracts/auth/schemas";
import type { PublicUser } from "@/contracts/auth/types";
import { verifyAgainstDummy, verifyPassword } from "./password";
import { createSession } from "./sessions";
import { signToken } from "./token";

export type LoginResult = {
  token: string;
  expiresAt: Date;
  user: PublicUser;
};

export async function authenticate({
  email,
  password,
}: LoginInput): Promise<LoginResult> {
  const prisma = getPrisma();

  const recentFailures = await prisma.loginAttempt.count({
    where: {
      email,
      attemptedAt: { gte: new Date(Date.now() - LOGIN_FAILURE_WINDOW_MS) },
    },
  });
  if (recentFailures >= LOGIN_FAILURE_LIMIT) {
    throw new HttpError(
      429,
      "Too many failed sign-in attempts. Try again in a few minutes.",
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  let verified = false;
  if (user) {
    verified = await verifyPassword(password, user.passwordHash);
  } else {
    await verifyAgainstDummy(password);
  }

  if (!user || !verified) {
    await prisma.loginAttempt.create({ data: { email } });
    throw new HttpError(401, INVALID_CREDENTIALS_MESSAGE);
  }

  await prisma.loginAttempt.deleteMany({ where: { email } });

  const { sessionId, expiresAt } = await createSession(user.id);
  const token = await signToken(
    { userId: user.id, sessionId, role: user.role },
    expiresAt,
  );
  return {
    token,
    expiresAt,
    user: { id: user.id, name: user.name, role: user.role },
  };
}

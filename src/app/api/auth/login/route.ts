import { loginSchema } from "@/features/auth/schemas";
import { authenticate } from "@/features/auth/server/login";
import { errorResponse } from "@/shared/server/errors";
import { readJson } from "@/shared/server/http";

export async function POST(request: Request) {
  try {
    const { token, user } = await authenticate(loginSchema.parse(await readJson(request)));
    return Response.json({ token, user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
